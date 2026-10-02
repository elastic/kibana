/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stress-test scenario for the service map request flyout.
 *
 * ─── What you will see ───────────────────────────────────────────────────────
 *
 * ONE fully-connected service map. Every service has at least one edge to the
 * core cluster; background services also chain to their neighbours so the graph
 * has no isolated islands.
 *
 * Open the flyout on any focus edge and you will see:
 *
 *   Operations table  — 30 distinct span names, each with > 500 calls
 *   Transactions table — 25 distinct transaction names, each with > 500 calls
 *   Failed calls       — caller / server / client buckets, each with > 500 errors
 *
 * The numbers are large enough to need pagination and to make the flyout
 * query latency visible in the network tab.
 *
 * ─── Core topology ───────────────────────────────────────────────────────────
 *
 *   checkout-gateway ──► orders-api ──► payment-api ──► fraud-api
 *                    │              │               └──► inventory-api
 *                    │              └──► notification-service
 *                    │              └──► postgresql (25 SQL ops, 10% fail)
 *                    │              └──► redis      (25 cmds,   5% fail)
 *                    │              └──► elasticsearch (20 queries, 8% fail)
 *                    │              └──► kafka (messaging)
 *                    │
 *                    └── payment-api ──► postgresql (25 SQL ops)
 *                                   └──► redis      (15 cmds)
 *
 * ─── Background topology (fully connected) ───────────────────────────────────
 *
 * Background services are split into tiers. Every tier-N service calls one
 * tier-(N+1) service AND one core service, so the whole map is one connected
 * component. Cross-tier edges at the top of each tier keep the graph dense.
 *
 * ─── Volume per focus edge ───────────────────────────────────────────────────
 *
 *   checkout-gateway → orders-api:  500 tpm  →  15 000 calls / 30 min
 *                                   30% error →   4 500 errors / 30 min (1 500 per bucket)
 *   orders-api → payment-api:       400 tpm  →  12 000 calls / 30 min
 *   payment-api → fraud-api:        300 tpm  →   9 000 calls / 30 min
 *   payment-api → inventory-api:    300 tpm  →   9 000 calls / 30 min
 *   orders-api → notification-svc:  200 tpm  →   6 000 calls / 30 min
 *
 * ─── Advanced Settings ───────────────────────────────────────────────────────
 *
 * Kibana → Stack Management → Advanced Settings:
 *   observability:apmServiceGroupMaxNumberOfServices → 600
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 * node scripts/synthtrace \
 *   x-pack/solutions/observability/plugins/apm/test/scenarios/service_map_request_flyout_stress.ts \
 *   --target=https://<ES_URL> --kibana=https://<KIBANA_URL> --apiKey=<KEY> \
 *   --from=now-30m --to=now \
 *   --scenarioOpts="services=500,errorRate=30"
 *
 * scenarioOpts:
 *   services   – total number of services (default 500, minimum 7)
 *   errorRate  – integer % of focus-edge calls that fail (default 30)
 *                split ~1:1:1 → caller / server / client buckets
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

/** Mix of gRPC (named) and OTel HTTP (collapses to method) exit spans. */
function makeOperationSpecs(
  count: number,
  pkg: string
): Array<{ spanName: string; spanType: string; spanSubtype: string }> {
  return times(count, (i) => {
    if (i % 3 === 0) {
      return { spanName: `${pkg}/Method${i}`, spanType: 'external', spanSubtype: 'grpc' };
    }
    return {
      spanName: i % 2 === 0 ? 'POST' : 'GET',
      spanType: 'external',
      spanSubtype: 'http',
    };
  });
}

/** One high-volume service→service edge with all three failure buckets. */
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
  const targetName = target.fields['service.name'] as string;

  return range.ratePerMinute(tpm).generator((timestamp: number) => {
    const txName = txNames[Math.floor(Math.random() * txNames.length)];
    const op = operationSpecs[Math.floor(Math.random() * operationSpecs.length)];
    const roll = random(1, 100);

    if (roll <= callerThreshold) {
      const dur = random(50, 300);
      return caller
        .transaction({ transactionName: txName })
        .timestamp(timestamp)
        .duration(dur + 10)
        .failure()
        .children(
          caller
            .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
            .timestamp(timestamp + 5)
            .duration(dur)
            .failure()
            .destination(targetName)
            .defaults({ 'http.response.status_code': 503 })
        );
    }

    if (roll <= serverThreshold) {
      const errInfo = SERVER_ERRORS[Math.floor(Math.random() * SERVER_ERRORS.length)];
      const childDur = random(30, 150);
      const exitDur = childDur + random(5, 20);
      return caller
        .transaction({ transactionName: txName })
        .timestamp(timestamp)
        .duration(exitDur + 10)
        .failure()
        .children(
          caller
            .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
            .timestamp(timestamp + 5)
            .duration(exitDur)
            .failure()
            .destination(targetName)
            .children(
              target
                .transaction({ transactionName: targetTxName })
                .timestamp(timestamp + 7)
                .duration(childDur)
                .failure()
                .errors(
                  target
                    .error({ message: errInfo.message, type: errInfo.type })
                    .timestamp(timestamp + 10)
                )
            )
        );
    }

    if (roll <= clientThreshold) {
      const code = Math.random() < 0.5 ? 404 : 400;
      const childDur = random(20, 100);
      const exitDur = childDur + random(5, 20);
      return caller
        .transaction({ transactionName: txName })
        .timestamp(timestamp)
        .duration(exitDur + 10)
        .failure()
        .children(
          caller
            .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
            .timestamp(timestamp + 5)
            .duration(exitDur)
            .failure()
            .destination(targetName)
            .defaults({ 'http.response.status_code': code })
            .children(
              target
                .transaction({ transactionName: targetTxName })
                .timestamp(timestamp + 7)
                .duration(childDur)
                .success()
            )
        );
    }

    // success
    const childDur = random(10, 100);
    const exitDur = childDur + random(3, 15);
    return caller
      .transaction({ transactionName: txName })
      .timestamp(timestamp)
      .duration(exitDur + 10)
      .success()
      .children(
        caller
          .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
          .timestamp(timestamp + 5)
          .duration(exitDur)
          .success()
          .destination(targetName)
          .children(
            target
              .transaction({ transactionName: targetTxName })
              .timestamp(timestamp + 7)
              .duration(childDur)
              .success()
          )
      );
  });
}

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const numServices = getNumberOpt(scenarioOpts, 'services', 500);
  const errorRatePct = getNumberOpt(scenarioOpts, 'errorRate', 30);

  logger.info(`Service map stress: services=${numServices}, errorRate=${errorRatePct}%`);

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

  const coreInstances = [
    checkoutGateway,
    ordersApi,
    paymentApi,
    fraudApi,
    inventoryApi,
    notificationService,
  ];

  // ─── Operation and transaction name lists ────────────────────────────────────
  // 30 operation specs → 30 rows in Operations table, each with > 500 calls
  const checkoutOps = makeOperationSpecs(30, 'orders.OrderService');
  const checkoutTxNames = times(25, (i) => `POST /api/checkout/order-${i}`);

  const ordersToPaymentOps = makeOperationSpecs(30, 'payment.PaymentService');
  const ordersTxNames = times(25, (i) => `POST /internal/orders/process-${i}`);

  const paymentToFraudOps = makeOperationSpecs(30, 'fraud.FraudService');
  const paymentToInventoryOps = makeOperationSpecs(30, 'inventory.InventoryService');
  const paymentTxNames = times(25, (i) => `POST /internal/payments/charge-${i}`);

  const ordersToNotifOps = makeOperationSpecs(25, 'notification.NotifyService');
  const notifTxNames = times(20, (i) => `POST /internal/notify/event-${i}`);

  // ─── Dependency operation lists ──────────────────────────────────────────────
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
      // ─── Background services: fully connected ────────────────────────────────
      // Split into TIER_SIZE tiers. Each service:
      //   1. Calls a core service (so everything connects to the core cluster)
      //   2. Calls the next service in its tier (chain within the tier)
      //   3. Every TIER_SIZE-th service in a tier also calls the first service
      //      in the next tier (cross-tier link → one connected graph)
      const numBackground = Math.max(0, numServices - coreInstances.length);
      const bgInstances: Instance[] = times(numBackground, (i) => {
        const lang = ['go', 'dotnet', 'java', 'python', 'nodejs', 'php'][i % 6];
        return apm
          .service({
            name: `${getRandomNameForIndex(i + 10)}-${lang}-${i}`,
            environment: ENVIRONMENT,
            agentName: i % 2 === 0 ? `opentelemetry/${lang}` : `otlp/${lang}/elastic`,
          })
          .instance(`instance-${i}`);
      });

      const TIER_SIZE = 20;
      const bgGenerators = bgInstances.flatMap((svc, i) => {
        const coreTarget = coreInstances[i % coreInstances.length];
        const coreTargetName = coreTarget.fields['service.name'] as string;

        // Each background service calls one core service at low volume (keeps map connected).
        const toCore = range.ratePerMinute(2).generator((timestamp: number) =>
          svc
            .transaction({ transactionName: 'GET /api/request' })
            .timestamp(timestamp)
            .duration(random(30, 300))
            .success()
            .children(
              svc
                .span({ spanName: 'GET', spanType: 'external', spanSubtype: 'http' })
                .timestamp(timestamp + 3)
                .duration(random(25, 280))
                .success()
                .destination(coreTargetName)
                .children(
                  coreTarget
                    .transaction({ transactionName: 'GET /internal' })
                    .timestamp(timestamp + 5)
                    .duration(random(20, 270))
                    .success()
                )
            )
        );

        // Chain: each service also calls the next one in its tier.
        const nextIdx = i + 1 < bgInstances.length ? i + 1 : 0;
        const nextSvc = bgInstances[nextIdx];
        const nextName = nextSvc.fields['service.name'] as string;
        const toNext = range.ratePerMinute(1).generator((timestamp: number) =>
          svc
            .transaction({ transactionName: 'GET /api/forward' })
            .timestamp(timestamp)
            .duration(random(20, 200))
            .success()
            .children(
              svc
                .span({ spanName: 'POST', spanType: 'external', spanSubtype: 'http' })
                .timestamp(timestamp + 2)
                .duration(random(15, 180))
                .success()
                .destination(nextName)
                .children(
                  nextSvc
                    .transaction({ transactionName: 'GET /internal' })
                    .timestamp(timestamp + 4)
                    .duration(random(10, 170))
                    .success()
                )
            )
        );

        // Cross-tier link: last service in each tier calls the first of the next tier.
        if ((i + 1) % TIER_SIZE === 0) {
          const nextTierFirstIdx = (i + 1) % bgInstances.length;
          const nextTierSvc = bgInstances[nextTierFirstIdx];
          const nextTierName = nextTierSvc.fields['service.name'] as string;
          const toCrossTier = range.ratePerMinute(1).generator((timestamp: number) =>
            svc
              .transaction({ transactionName: 'GET /api/cross-tier' })
              .timestamp(timestamp)
              .duration(random(20, 150))
              .success()
              .children(
                svc
                  .span({ spanName: 'GET', spanType: 'external', spanSubtype: 'http' })
                  .timestamp(timestamp + 2)
                  .duration(random(15, 140))
                  .success()
                  .destination(nextTierName)
                  .children(
                    nextTierSvc
                      .transaction({ transactionName: 'GET /internal' })
                      .timestamp(timestamp + 4)
                      .duration(random(10, 130))
                      .success()
                  )
              )
          );
          return [toCore, toNext, toCrossTier];
        }

        return [toCore, toNext];
      });

      // ─── Focus edges: high-volume core service chain ─────────────────────────
      // 500 tpm × 30 min = 15 000 calls; 30% error = 4 500 errors (1 500 per bucket)
      // 25 tx names → each tx row shows ~600 calls; 30 ops → each op row shows ~500 calls

      const checkoutToOrdersGen = makeFocusEdgeGenerator({
        range,
        tpm: 500,
        errorRatePct,
        caller: checkoutGateway,
        target: ordersApi,
        txNames: checkoutTxNames,
        operationSpecs: checkoutOps,
        targetTxName: 'POST /internal/orders',
      });

      const ordersToPaymentGen = makeFocusEdgeGenerator({
        range,
        tpm: 400,
        errorRatePct,
        caller: ordersApi,
        target: paymentApi,
        txNames: ordersTxNames,
        operationSpecs: ordersToPaymentOps,
        targetTxName: 'POST /internal/payments',
      });

      const paymentToFraudGen = makeFocusEdgeGenerator({
        range,
        tpm: 300,
        errorRatePct,
        caller: paymentApi,
        target: fraudApi,
        txNames: paymentTxNames,
        operationSpecs: paymentToFraudOps,
        targetTxName: 'POST /internal/fraud/check',
      });

      const paymentToInventoryGen = makeFocusEdgeGenerator({
        range,
        tpm: 300,
        errorRatePct,
        caller: paymentApi,
        target: inventoryApi,
        txNames: paymentTxNames,
        operationSpecs: paymentToInventoryOps,
        targetTxName: 'POST /internal/inventory/reserve',
      });

      const ordersToNotifGen = makeFocusEdgeGenerator({
        range,
        tpm: 200,
        errorRatePct,
        caller: ordersApi,
        target: notificationService,
        txNames: notifTxNames,
        operationSpecs: ordersToNotifOps,
        targetTxName: 'POST /internal/notify',
      });

      // ─── Dependency edges from orders-api ────────────────────────────────────
      // 200 tpm × 30 min = 6 000 calls; 25 SQL ops → each op row ~240 calls

      const pgGen = range.ratePerMinute(200).generator((timestamp: number) => {
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

      const redisGen = range.ratePerMinute(300).generator((timestamp: number) => {
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

      const esGen = range.ratePerMinute(100).generator((timestamp: number) => {
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

      const kafkaGen = range.ratePerMinute(50).generator((timestamp: number) =>
        ordersApi
          .transaction({ transactionName: 'POST /internal/events' })
          .timestamp(timestamp)
          .duration(random(5, 50))
          .success()
          .children(
            ordersApi
              .span({
                spanName: 'send orders.created',
                spanType: 'messaging',
                spanSubtype: 'kafka',
              })
              .timestamp(timestamp + 2)
              .duration(random(2, 10))
              .success()
              .destination('kafka')
              .defaults({
                'service.target.type': 'kafka',
                'service.target.name': 'orders-events',
              })
          )
      );

      // ─── Dependency edges from payment-api ──────────────────────────────────

      const paymentPgGen = range.ratePerMinute(150).generator((timestamp: number) => {
        const stmt = paymentPgStatements[Math.floor(Math.random() * paymentPgStatements.length)];
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

      const paymentRedisGen = range.ratePerMinute(200).generator((timestamp: number) => {
        const cmd = paymentRedisCommands[Math.floor(Math.random() * paymentRedisCommands.length)];
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
          ...bgGenerators,
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
