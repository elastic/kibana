/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stress-test scenario for the service map request flyout.
 *
 * Purpose: produce a dense, realistic-looking map with 500+ services and
 * several high-traffic, high-error edges between core services. Use it to:
 *
 *   • Open the flyout on any focus edge and see 50 operations and 50
 *     transactions in the corresponding tables — enough data to page through.
 *   • See all three failure buckets (caller / server / client) on every
 *     service→service edge and the dependency bucket on every s→dep edge.
 *   • Trigger the MAX_IDS (1 000) sampled callout by raising errorRate > 33.
 *   • Reproduce the HTTP span-name collapse (spike A): HTTP exit spans have
 *     span.name = method only ("POST" / "GET"), so all HTTP calls collapse
 *     to 2 operation rows. gRPC and db spans work correctly.
 *   • Measure flyout query latency on a 500-node map via the browser network
 *     tab (routes: service-map/connection/failed_calls, …/transactions, …/operations).
 *
 * ─── Core service topology ────────────────────────────────────────────────────
 *
 *   checkout-gateway
 *     └─► orders-api       (s→s, 50 ops, 50 txns, all 3 failure buckets)
 *           ├─► payment-api (s→s, 40 ops, 40 txns, all 3 failure buckets)
 *           │     ├─► fraud-api       (s→s, 30 ops, 30 txns)
 *           │     └─► inventory-api   (s→s, 30 ops, 30 txns)
 *           ├─► notification-service  (s→s, 20 ops, 20 txns)
 *           ├─► postgresql   (s→dep, 25 SQL statements, ~10% fail)
 *           └─► redis        (s→dep, 25 commands,       ~5% fail)
 *   orders-api
 *           ├─► elasticsearch (s→dep, 20 queries, ~8% fail)
 *           └─► kafka         (s→dep, messaging, no RED metrics)
 *   payment-api
 *           ├─► postgresql   (s→dep, 25 SQL statements)
 *           └─► redis        (s→dep, 15 commands)
 *
 * All focus edges produce > 500 errors over 30 min at the default errorRate.
 * Each gateway service has 50 entry-transaction names so pagination is needed.
 *
 * ─── Background ───────────────────────────────────────────────────────────────
 *
 * The remaining (services − 7) services fill out a 500-node map. They are
 * arranged in gateway→backend clusters of ~10, with every third cluster
 * calling the next cluster's gateway to produce cross-cluster edges and a
 * denser, more realistic graph.
 *
 * ─── Advanced Settings to raise before running ──────────────────────────────
 *
 * Kibana → Stack Management → Advanced Settings:
 *   observability:apmServiceGroupMaxNumberOfServices → 600 (or higher)
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 * node scripts/synthtrace \
 *   x-pack/solutions/observability/plugins/apm/test/scenarios/service_map_request_flyout_stress.ts \
 *   --target=https://<ES_URL> \
 *   --kibana=https://<KIBANA_URL> \
 *   --apiKey=<ENCODED_API_KEY> \
 *   --from=now-30m --to=now \
 *   --scenarioOpts="services=500,errorRate=30"
 *
 * scenarioOpts:
 *   services   – total services (default 500, must be ≥ 7)
 *   errorRate  – integer % of focus-edge calls that fail, split ~1:1:1 among
 *                caller / server / client buckets (default 30, gives > 500
 *                errors per edge over 30 min)
 */

import type { ApmFields, Instance } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { random, times } from 'lodash';
import type { Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment, withClient, getNumberOpt } from '@kbn/synthtrace';
import { getRandomNameForIndex } from './helpers/random_names';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const SERVER_ERRORS = [
  { message: 'NullPointerException in OrderProcessor', type: 'java.lang.NullPointerException' },
  { message: 'Database connection pool exhausted', type: 'DBConnectionError' },
  { message: 'Invalid order state transition: PENDING → CANCELLED', type: 'OrderStateException' },
  {
    message: 'Inventory service: insufficient stock for requested quantity',
    type: 'InsufficientInventoryError',
  },
  { message: 'Payment gateway timeout after 30s', type: 'GatewayTimeoutException' },
  { message: 'Fraud score threshold exceeded', type: 'FraudDetectionException' },
];

/**
 * Build a list of exit-span operation specs for a service→service edge.
 * Every third span is gRPC (useful name); the rest are OTel HTTP (collapses).
 */
function makeOperationSpecs(
  count: number,
  serviceName: string
): Array<{ spanName: string; spanType: string; spanSubtype: string }> {
  return times(count, (i) => {
    if (i % 3 === 0) {
      const pkg = serviceName.replace(/-/g, '.').replace(/api$/, 'Service');
      return {
        spanName: `${pkg}/Method${i}`,
        spanType: 'external',
        spanSubtype: 'grpc',
      };
    }
    return {
      spanName: i % 2 === 0 ? 'POST' : 'GET',
      spanType: 'external',
      spanSubtype: 'http',
    };
  });
}

/**
 * Emit one focus edge's traces per tick.
 * Splits errorRate% into caller / server / client buckets ~1:1:1.
 */
function makeFocusEdgeGenerator(opts: {
  range: any;
  tpm: number;
  errorRatePct: number;
  caller: Instance;
  target: Instance;
  txNames: string[];
  operationSpecs: Array<{ spanName: string; spanType: string; spanSubtype: string }>;
  targetTxName: string;
}) {
  const { range, tpm, errorRatePct, caller, target, txNames, operationSpecs, targetTxName } = opts;
  const callerThreshold = Math.max(1, Math.round((errorRatePct * 1) / 3));
  const serverThreshold = Math.max(callerThreshold, Math.round((errorRatePct * 2) / 3));
  const clientThreshold = errorRatePct;

  return range.ratePerMinute(tpm).generator((timestamp: number) => {
    const txName = txNames[Math.floor(Math.random() * txNames.length)];
    const op = operationSpecs[Math.floor(Math.random() * operationSpecs.length)];
    const roll = random(1, 100);
    const targetName = target.fields['service.name'] as string;

    if (roll <= callerThreshold) {
      const exitDuration = random(50, 300);
      const exitSpan = caller
        .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
        .timestamp(timestamp + 5)
        .duration(exitDuration)
        .failure()
        .destination(targetName)
        .defaults({ 'http.response.status_code': 503 });
      return caller
        .transaction({ transactionName: txName })
        .timestamp(timestamp)
        .duration(exitDuration + 10)
        .failure()
        .children(exitSpan);
    }

    if (roll <= serverThreshold) {
      const errInfo = SERVER_ERRORS[Math.floor(Math.random() * SERVER_ERRORS.length)];
      const childDuration = random(30, 150);
      const exitDuration = childDuration + random(5, 20);
      const childTx = target
        .transaction({ transactionName: targetTxName })
        .timestamp(timestamp + 7)
        .duration(childDuration)
        .failure()
        .errors(
          target
            .error({ message: errInfo.message, type: errInfo.type })
            .timestamp(timestamp + 10)
        );
      const exitSpan = caller
        .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
        .timestamp(timestamp + 5)
        .duration(exitDuration)
        .failure()
        .destination(targetName)
        .children(childTx);
      return caller
        .transaction({ transactionName: txName })
        .timestamp(timestamp)
        .duration(exitDuration + 10)
        .failure()
        .children(exitSpan);
    }

    if (roll <= clientThreshold) {
      const statusCode = Math.random() < 0.5 ? 404 : 400;
      const childDuration = random(20, 100);
      const exitDuration = childDuration + random(5, 20);
      const childTx = target
        .transaction({ transactionName: targetTxName })
        .timestamp(timestamp + 7)
        .duration(childDuration)
        .success();
      const exitSpan = caller
        .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
        .timestamp(timestamp + 5)
        .duration(exitDuration)
        .failure()
        .destination(targetName)
        .defaults({ 'http.response.status_code': statusCode })
        .children(childTx);
      return caller
        .transaction({ transactionName: txName })
        .timestamp(timestamp)
        .duration(exitDuration + 10)
        .failure()
        .children(exitSpan);
    }

    // success
    const childDuration = random(10, 100);
    const exitDuration = childDuration + random(3, 15);
    const childTx = target
      .transaction({ transactionName: targetTxName })
      .timestamp(timestamp + 7)
      .duration(childDuration)
      .success();
    const exitSpan = caller
      .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
      .timestamp(timestamp + 5)
      .duration(exitDuration)
      .success()
      .destination(targetName)
      .children(childTx);
    return caller
      .transaction({ transactionName: txName })
      .timestamp(timestamp)
      .duration(exitDuration + 10)
      .success()
      .children(exitSpan);
  });
}

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const numServices = getNumberOpt(scenarioOpts, 'services', 500);
  const errorRatePct = getNumberOpt(scenarioOpts, 'errorRate', 30);

  logger.info(
    `Service map request flyout stress: services=${numServices}, errorRate=${errorRatePct}%`
  );

  // ─── Core services ──────────────────────────────────────────────────────────
  const checkoutGateway = apm
    .service({ name: 'checkout-gateway', environment: ENVIRONMENT, agentName: 'opentelemetry/go' })
    .instance('checkout-gateway-1');

  const ordersApi = apm
    .service({ name: 'orders-api', environment: ENVIRONMENT, agentName: 'opentelemetry/java' })
    .instance('orders-api-1');

  const paymentApi = apm
    .service({ name: 'payment-api', environment: ENVIRONMENT, agentName: 'opentelemetry/python' })
    .instance('payment-api-1');

  const fraudApi = apm
    .service({ name: 'fraud-api', environment: ENVIRONMENT, agentName: 'opentelemetry/nodejs' })
    .instance('fraud-api-1');

  const inventoryApi = apm
    .service({ name: 'inventory-api', environment: ENVIRONMENT, agentName: 'opentelemetry/go' })
    .instance('inventory-api-1');

  const notificationService = apm
    .service({
      name: 'notification-service',
      environment: ENVIRONMENT,
      agentName: 'opentelemetry/python',
    })
    .instance('notification-service-1');

  // ─── Operation / transaction name lists per edge ─────────────────────────────
  // 50 ops on primary edges → 50 rows in the Operations table (pagination needed).
  // 50 tx names per caller → 50 rows in the Transactions table.
  const checkoutOps = makeOperationSpecs(50, 'orders-api');
  const checkoutTxNames = times(50, (i) => `POST /api/checkout/order-${i}`);

  const ordersToPaymentOps = makeOperationSpecs(40, 'payment-api');
  const ordersTxNames = times(40, (i) => `POST /internal/orders/process-${i}`);

  const paymentToFraudOps = makeOperationSpecs(30, 'fraud-api');
  const paymentToInventoryOps = makeOperationSpecs(30, 'inventory-api');
  const paymentTxNames = times(30, (i) => `POST /internal/payments/charge-${i}`);

  const ordersToNotifOps = makeOperationSpecs(20, 'notification-service');
  const notifTxNames = times(20, (i) => `POST /internal/notify/event-${i}`);

  // ─── Dependency operation names ──────────────────────────────────────────────
  const pgStatements = times(25, (i) => `SELECT * FROM orders WHERE status = $${i + 1}`);
  const redisCommands = times(25, (i) => {
    const cmds = ['GET', 'SET', 'HGET', 'HSET', 'ZADD', 'ZRANGE', 'DEL', 'EXPIRE'];
    return `${cmds[i % cmds.length]} orders:cache:${i}`;
  });
  const esQueries = times(20, (i) => `search orders-index-${i}`);
  const paymentPgStatements = times(25, (i) => `SELECT * FROM payments WHERE id = $${i + 1}`);
  const paymentRedisCommands = times(15, (i) => {
    const cmds = ['GET', 'SET', 'HGET', 'DEL'];
    return `${cmds[i % cmds.length]} payment:session:${i}`;
  });

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      // ─── Background services ─────────────────────────────────────────────────
      // Fill out the map. Every third cluster calls the next cluster's gateway
      // to create cross-cluster edges and a denser graph.
      const numBackground = Math.max(0, numServices - 7);
      const backgroundInstances: Instance[] = times(numBackground, (i) => {
        const lang = ['go', 'dotnet', 'java', 'python', 'nodejs', 'php'][i % 6];
        return apm
          .service({
            name: `${getRandomNameForIndex(i + 10)}-${lang}-${i}`,
            environment: ENVIRONMENT,
            agentName: i % 2 === 0 ? `opentelemetry/${lang}` : `otlp/${lang}/elastic`,
          })
          .instance(`instance-${i}`);
      });

      const clusterSize = 10;
      const numClusters = Math.ceil(backgroundInstances.length / clusterSize);

      const backgroundGenerators = times(numClusters).flatMap((ci) => {
        const gwIdx = ci * clusterSize;
        if (gwIdx >= backgroundInstances.length) return [];
        const bgGateway = backgroundInstances[gwIdx];
        const bgBackends = times(clusterSize - 1)
          .map((b) => gwIdx + 1 + b)
          .filter((i) => i < backgroundInstances.length)
          .map((i) => backgroundInstances[i]);

        const generators = [
          range.ratePerMinute(2).generator((timestamp: number) => {
            const backendSpans = bgBackends.map((backend, j) =>
              bgGateway
                .span({
                  spanName: `call ${backend.fields['service.name']}`,
                  spanType: 'external',
                  spanSubtype: 'http',
                })
                .timestamp(timestamp + j * 5)
                .duration(random(20, 200))
                .success()
                .destination(backend.fields['service.name'] as string)
                .children(
                  backend
                    .transaction({ transactionName: 'GET /internal' })
                    .timestamp(timestamp + j * 5 + 2)
                    .duration(random(15, 195))
                    .success()
                )
            );
            return bgGateway
              .transaction({ transactionName: 'GET /api/request' })
              .timestamp(timestamp)
              .duration(random(50, 500))
              .success()
              .children(...backendSpans);
          }),
        ];

        // Every third cluster calls the next cluster's gateway (cross-cluster edge).
        if (ci % 3 === 2) {
          const nextGwIdx = ((ci + 1) % numClusters) * clusterSize;
          if (nextGwIdx < backgroundInstances.length && nextGwIdx !== gwIdx) {
            const nextGateway = backgroundInstances[nextGwIdx];
            generators.push(
              range.ratePerMinute(1).generator((timestamp: number) =>
                bgGateway
                  .transaction({ transactionName: 'GET /api/cross-call' })
                  .timestamp(timestamp)
                  .duration(random(30, 300))
                  .success()
                  .children(
                    bgGateway
                      .span({ spanName: 'GET', spanType: 'external', spanSubtype: 'http' })
                      .timestamp(timestamp + 3)
                      .duration(random(25, 280))
                      .success()
                      .destination(nextGateway.fields['service.name'] as string)
                      .children(
                        nextGateway
                          .transaction({ transactionName: 'GET /internal' })
                          .timestamp(timestamp + 5)
                          .duration(random(20, 270))
                          .success()
                      )
                  )
              )
            );
          }
        }

        return generators;
      });

      // ─── Focus edges: core service chain ─────────────────────────────────────
      // Each edge runs at enough tpm + errorRate to accumulate > 500 errors over 30 min.
      // e.g. 120 tpm × 30% errorRate × 30 min = 1 080 errors.

      // checkout-gateway → orders-api  (primary edge, highest traffic)
      const checkoutToOrdersGen = makeFocusEdgeGenerator({
        range,
        tpm: 120,
        errorRatePct,
        caller: checkoutGateway,
        target: ordersApi,
        txNames: checkoutTxNames,
        operationSpecs: checkoutOps,
        targetTxName: 'POST /internal/orders',
      });

      // orders-api → payment-api
      const ordersToPaymentGen = makeFocusEdgeGenerator({
        range,
        tpm: 100,
        errorRatePct,
        caller: ordersApi,
        target: paymentApi,
        txNames: ordersTxNames,
        operationSpecs: ordersToPaymentOps,
        targetTxName: 'POST /internal/payments',
      });

      // payment-api → fraud-api
      const paymentToFraudGen = makeFocusEdgeGenerator({
        range,
        tpm: 80,
        errorRatePct,
        caller: paymentApi,
        target: fraudApi,
        txNames: paymentTxNames,
        operationSpecs: paymentToFraudOps,
        targetTxName: 'POST /internal/fraud/check',
      });

      // payment-api → inventory-api
      const paymentToInventoryGen = makeFocusEdgeGenerator({
        range,
        tpm: 80,
        errorRatePct,
        caller: paymentApi,
        target: inventoryApi,
        txNames: paymentTxNames,
        operationSpecs: paymentToInventoryOps,
        targetTxName: 'POST /internal/inventory/reserve',
      });

      // orders-api → notification-service (lower volume)
      const ordersToNotifGen = makeFocusEdgeGenerator({
        range,
        tpm: 60,
        errorRatePct,
        caller: ordersApi,
        target: notificationService,
        txNames: notifTxNames,
        operationSpecs: ordersToNotifOps,
        targetTxName: 'POST /internal/notify',
      });

      // ─── Dependency edges from orders-api ────────────────────────────────────

      const pgGen = range.ratePerMinute(50).generator((timestamp: number) => {
        const stmt = pgStatements[Math.floor(Math.random() * pgStatements.length)];
        const dur = random(5, 200);
        const isFailed = random(1, 10) === 1;
        const pgSpan = ordersApi
          .span({ spanName: stmt, spanType: 'db', spanSubtype: 'postgresql' })
          .timestamp(timestamp + 2)
          .duration(dur)
          .destination('postgresql')
          .defaults({ 'service.target.type': 'postgresql', 'service.target.name': 'orders-db' });
        return ordersApi
          .transaction({ transactionName: 'GET /internal/orders' })
          .timestamp(timestamp)
          .duration(dur + 5)
          [isFailed ? 'failure' : 'success']()
          .children(isFailed ? pgSpan.failure() : pgSpan.success());
      });

      const redisGen = range.ratePerMinute(80).generator((timestamp: number) => {
        const cmd = redisCommands[Math.floor(Math.random() * redisCommands.length)];
        const dur = random(1, 20);
        const isFailed = random(1, 20) === 1;
        const redisSpan = ordersApi
          .span({ spanName: cmd, spanType: 'db', spanSubtype: 'redis' })
          .timestamp(timestamp + 1)
          .duration(dur)
          .destination('redis')
          .defaults({ 'service.target.type': 'redis', 'service.target.name': 'orders-cache' });
        return ordersApi
          .transaction({ transactionName: 'GET /internal/orders' })
          .timestamp(timestamp)
          .duration(dur + 2)
          [isFailed ? 'failure' : 'success']()
          .children(isFailed ? redisSpan.failure() : redisSpan.success());
      });

      const esGen = range.ratePerMinute(30).generator((timestamp: number) => {
        const q = esQueries[Math.floor(Math.random() * esQueries.length)];
        const dur = random(10, 300);
        const isFailed = random(1, 12) === 1;
        const esSpan = ordersApi
          .span({ spanName: q, spanType: 'db', spanSubtype: 'elasticsearch' })
          .timestamp(timestamp + 2)
          .duration(dur)
          .destination('elasticsearch')
          .defaults({
            'service.target.type': 'elasticsearch',
            'service.target.name': 'orders-search',
          });
        return ordersApi
          .transaction({ transactionName: 'GET /internal/search' })
          .timestamp(timestamp)
          .duration(dur + 5)
          [isFailed ? 'failure' : 'success']()
          .children(isFailed ? esSpan.failure() : esSpan.success());
      });

      const kafkaGen = range.ratePerMinute(10).generator((timestamp: number) =>
        ordersApi
          .transaction({ transactionName: 'POST /internal/events' })
          .timestamp(timestamp)
          .duration(random(5, 50))
          .success()
          .children(
            ordersApi
              .span({ spanName: 'send orders.created', spanType: 'messaging', spanSubtype: 'kafka' })
              .timestamp(timestamp + 2)
              .duration(random(2, 10))
              .success()
              .destination('kafka')
              .defaults({ 'service.target.type': 'kafka', 'service.target.name': 'orders-events' })
          )
      );

      // ─── Dependency edges from payment-api ──────────────────────────────────

      const paymentPgGen = range.ratePerMinute(40).generator((timestamp: number) => {
        const stmt =
          paymentPgStatements[Math.floor(Math.random() * paymentPgStatements.length)];
        const dur = random(5, 150);
        const isFailed = random(1, 10) === 1;
        const pgSpan = paymentApi
          .span({ spanName: stmt, spanType: 'db', spanSubtype: 'postgresql' })
          .timestamp(timestamp + 2)
          .duration(dur)
          .destination('postgresql')
          .defaults({
            'service.target.type': 'postgresql',
            'service.target.name': 'payments-db',
          });
        return paymentApi
          .transaction({ transactionName: 'GET /internal/payments' })
          .timestamp(timestamp)
          .duration(dur + 5)
          [isFailed ? 'failure' : 'success']()
          .children(isFailed ? pgSpan.failure() : pgSpan.success());
      });

      const paymentRedisGen = range.ratePerMinute(60).generator((timestamp: number) => {
        const cmd =
          paymentRedisCommands[Math.floor(Math.random() * paymentRedisCommands.length)];
        const dur = random(1, 15);
        const isFailed = random(1, 20) === 1;
        const redisSpan = paymentApi
          .span({ spanName: cmd, spanType: 'db', spanSubtype: 'redis' })
          .timestamp(timestamp + 1)
          .duration(dur)
          .destination('redis')
          .defaults({
            'service.target.type': 'redis',
            'service.target.name': 'payment-session-cache',
          });
        return paymentApi
          .transaction({ transactionName: 'GET /internal/payments' })
          .timestamp(timestamp)
          .duration(dur + 2)
          [isFailed ? 'failure' : 'success']()
          .children(isFailed ? redisSpan.failure() : redisSpan.success());
      });

      return withClient(
        apmEsClient,
        logger.perf('generating_service_map_stress_events', () => [
          ...backgroundGenerators,
          checkoutToOrdersGen,
          ordersToPaymentGen,
          paymentToFraudGen,
          paymentToInventoryGen,
          ordersToNotifGen,
          pgGen,
          redisGen,
          esGen,
          kafkaGen,
          paymentPgGen,
          paymentRedisGen,
        ])
      );
    },
  };
};

export default scenario;
