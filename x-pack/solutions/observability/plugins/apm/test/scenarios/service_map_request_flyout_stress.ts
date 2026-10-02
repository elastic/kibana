/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stress-test scenario for the service map request flyout.
 *
 * Purpose: produce a "real production environment" with ~500 services, 20+ operations
 * per edge, many distinct transaction names, and failures of every classification bucket
 * (caller / server / client) at throughput. Use it to:
 *
 *   • Verify the Operations and Transactions tables with more than 20 rows.
 *   • Confirm all three failure buckets (caller / server / client) appear for a s→s edge.
 *   • Trigger the MAX_IDS (1 000) sampled callout by raising errorRate above 50.
 *   • Measure flyout query latency on a 500-node map via the browser network tab
 *     (routes: `service-map/connection/failed_calls`, `…/transactions`, `…/operations`).
 *   • Reproduce the HTTP span-name collapse problem (spike A): HTTP exit spans have
 *     span.name = method only ("POST" / "GET"), so every HTTP call buckets into one
 *     operation row. The gRPC names work correctly.
 *
 * ─── Focus edges (open these in the flyout) ─────────────────────────────────
 *
 * checkout-gateway → orders-api  (service→service)
 *   Operations : mix of gRPC names (orders.OrderService/Method{i}, specific) and OTel HTTP
 *                names ("POST" / "GET", collapses to method only — the spike-A problem).
 *   Transactions: `transactions` checkout-gateway entry-point names.
 *   Failure buckets:
 *     caller  – exit span fails with HTTP 503, no child transaction recorded in orders-api.
 *     server  – child orders-api transaction fails; APM error doc linked by transaction.id.
 *               Four distinct error messages create multiple error groups.
 *     client  – child succeeds, exit span fails with HTTP 404 or 400.
 *
 * orders-api → postgresql  (service→dependency, 25 SQL operations ~10% failure)
 * orders-api → redis        (service→dependency, 25 commands ~5% failure)
 * orders-api → kafka        (messaging edge — no RED metrics, empty-state test)
 *
 * ─── Background ─────────────────────────────────────────────────────────────
 *
 * The remaining (services − 2) services are arranged in gateway→backend clusters of 10,
 * producing a large map with many nodes. Each gateway emits 2 traces/min so the volume
 * stays manageable.
 *
 * ─── Advanced Settings to raise before running ──────────────────────────────
 *
 * Kibana → Stack Management → Advanced Settings:
 *   observability:apmServiceGroupMaxNumberOfServices → 600 (or higher than `services`)
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 *
 * node scripts/synthtrace \
 *   x-pack/solutions/observability/plugins/apm/test/scenarios/service_map_request_flyout_stress.ts \
 *   --target=https://<ES_URL> \
 *   --kibana=https://<KIBANA_URL> \
 *   --apiKey=<ENCODED_API_KEY> \
 *   --from=now-30m --to=now \
 *   --scenarioOpts="services=500,operations=30,transactions=25,errorRate=15"
 *
 * scenarioOpts:
 *   services     – total services including the 2 focus services (default 500)
 *   operations   – exit span names on the focus edge (default 30)
 *   transactions – entry transaction names in checkout-gateway (default 25)
 *   errorRate    – integer % of focus-edge calls that fail, split ~1:1:1 among
 *                  caller/server/client buckets (default 15)
 */

import type { ApmFields, Instance } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { random, times } from 'lodash';
import type { Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment, withClient, getNumberOpt } from '@kbn/synthtrace';
import { getRandomNameForIndex } from './helpers/random_names';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

/** Four distinct error messages so the orders-api error group list has variety. */
const SERVER_ERRORS = [
  { message: 'NullPointerException in OrderProcessor', type: 'java.lang.NullPointerException' },
  { message: 'Database connection pool exhausted', type: 'DBConnectionError' },
  { message: 'Invalid order state transition: PENDING → CANCELLED', type: 'OrderStateException' },
  { message: 'Inventory service: insufficient stock for requested quantity', type: 'InsufficientInventoryError' },
];

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const numServices = getNumberOpt(scenarioOpts, 'services', 500);
  const numOperations = getNumberOpt(scenarioOpts, 'operations', 30);
  const numTransactions = getNumberOpt(scenarioOpts, 'transactions', 25);
  const errorRatePct = getNumberOpt(scenarioOpts, 'errorRate', 15);

  logger.info(
    `Service map request flyout stress: services=${numServices}, operations=${numOperations}, ` +
      `transactions=${numTransactions}, errorRate=${errorRatePct}%`
  );

  // ─── Focus services ────────────────────────────────────────────────────────
  const checkoutGateway = apm
    .service({ name: 'checkout-gateway', environment: ENVIRONMENT, agentName: 'opentelemetry/go' })
    .instance('checkout-gateway-1');

  const ordersApi = apm
    .service({ name: 'orders-api', environment: ENVIRONMENT, agentName: 'opentelemetry/java' })
    .instance('orders-api-1');

  // ─── Operation specs on the focus edge ─────────────────────────────────────
  // i % 3 === 0 → gRPC (specific, useful names)
  // i % 3 !== 0 → OTel HTTP (span.name = method only, demonstrates the collapse problem)
  const operationSpecs: Array<{
    spanName: string;
    spanType: string;
    spanSubtype: string;
  }> = times(numOperations, (i) => {
    if (i % 3 === 0) {
      return {
        spanName: `orders.OrderService/Method${i}`,
        spanType: 'external',
        spanSubtype: 'grpc',
      };
    }
    const method = i % 2 === 0 ? 'POST' : 'GET';
    return {
      spanName: method, // OTel HTTP collapse: span.name = method only
      spanType: 'external',
      spanSubtype: 'http',
    };
  });

  // ─── Entry transaction names in checkout-gateway ───────────────────────────
  const txNames = times(numTransactions, (i) => `POST /api/checkout/order-${i}`);

  // ─── Dependency operation specs from orders-api ────────────────────────────
  const pgStatements = times(25, (i) => `SELECT * FROM orders WHERE status = $${i + 1}`);
  const redisCommands = times(25, (i) => {
    const cmds = ['GET', 'SET', 'HGET', 'HSET', 'ZADD', 'ZRANGE', 'DEL', 'EXPIRE'];
    return `${cmds[i % cmds.length]} orders:cache:${i}`;
  });

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      // ─── Background services ─────────────────────────────────────────────────
      const numBackground = Math.max(0, numServices - 2);
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

        return [
          range.ratePerMinute(2).generator((timestamp) => {
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
      });

      // ─── Focus edge: checkout-gateway → orders-api ───────────────────────────
      // ~60 traces/min. Error rate split ~1:1:1 among caller / server / client.
      const callerThreshold = Math.max(1, Math.round((errorRatePct * 1) / 3));
      const serverThreshold = Math.max(callerThreshold, Math.round((errorRatePct * 2) / 3));
      const clientThreshold = errorRatePct;

      const focusGenerators = range.ratePerMinute(60).generator((timestamp) => {
        const txName = txNames[Math.floor(Math.random() * txNames.length)];
        const op = operationSpecs[Math.floor(Math.random() * operationSpecs.length)];
        const roll = random(1, 100);

        if (roll <= callerThreshold) {
          // ── caller bucket ────────────────────────────────────────────────────
          // Exit span fails (HTTP 503), no child transaction in orders-api.
          // Top error: no APM error doc → falls back to "HTTP 503" label.
          const exitDuration = random(50, 300);
          const exitSpan = checkoutGateway
            .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
            .timestamp(timestamp + 5)
            .duration(exitDuration)
            .failure()
            .destination('orders-api')
            .defaults({ 'http.response.status_code': 503 });
          return checkoutGateway
            .transaction({ transactionName: txName })
            .timestamp(timestamp)
            .duration(exitDuration + 10)
            .failure()
            .children(exitSpan);
        }

        if (roll <= serverThreshold) {
          // ── server bucket ────────────────────────────────────────────────────
          // Exit span linked to a failing child transaction in orders-api.
          // The child has an APM error doc (linked via transaction.id).
          const errInfo = SERVER_ERRORS[Math.floor(Math.random() * SERVER_ERRORS.length)];
          const childDuration = random(30, 150);
          const exitDuration = childDuration + random(5, 20);
          const childTx = ordersApi
            .transaction({ transactionName: 'POST /internal/orders' })
            .timestamp(timestamp + 5 + 2)
            .duration(childDuration)
            .failure()
            .errors(
              ordersApi
                .error({ message: errInfo.message, type: errInfo.type })
                .timestamp(timestamp + 5 + 5)
            );
          const exitSpan = checkoutGateway
            .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
            .timestamp(timestamp + 5)
            .duration(exitDuration)
            .failure()
            .destination('orders-api')
            .children(childTx);
          return checkoutGateway
            .transaction({ transactionName: txName })
            .timestamp(timestamp)
            .duration(exitDuration + 10)
            .failure()
            .children(exitSpan);
        }

        if (roll <= clientThreshold) {
          // ── client bucket ────────────────────────────────────────────────────
          // Child transaction succeeds; exit span fails with 4xx (client error).
          const statusCode = Math.random() < 0.5 ? 404 : 400;
          const childDuration = random(20, 100);
          const exitDuration = childDuration + random(5, 20);
          const childTx = ordersApi
            .transaction({ transactionName: 'POST /internal/orders' })
            .timestamp(timestamp + 5 + 2)
            .duration(childDuration)
            .success();
          const exitSpan = checkoutGateway
            .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
            .timestamp(timestamp + 5)
            .duration(exitDuration)
            .failure()
            .destination('orders-api')
            .defaults({ 'http.response.status_code': statusCode })
            .children(childTx);
          return checkoutGateway
            .transaction({ transactionName: txName })
            .timestamp(timestamp)
            .duration(exitDuration + 10)
            .failure()
            .children(exitSpan);
        }

        // ── success ──────────────────────────────────────────────────────────
        const childDuration = random(10, 100);
        const exitDuration = childDuration + random(3, 15);
        const childTx = ordersApi
          .transaction({ transactionName: 'POST /internal/orders' })
          .timestamp(timestamp + 5 + 2)
          .duration(childDuration)
          .success();
        const exitSpan = checkoutGateway
          .span({ spanName: op.spanName, spanType: op.spanType, spanSubtype: op.spanSubtype })
          .timestamp(timestamp + 5)
          .duration(exitDuration)
          .success()
          .destination('orders-api')
          .children(childTx);
        return checkoutGateway
          .transaction({ transactionName: txName })
          .timestamp(timestamp)
          .duration(exitDuration + 10)
          .success()
          .children(exitSpan);
      });

      // ─── Dependency edge: orders-api → postgresql ────────────────────────────
      // 25 distinct SQL statements. ~10% failure rate (dependency bucket).
      const pgGenerators = range.ratePerMinute(30).generator((timestamp) => {
        const stmt = pgStatements[Math.floor(Math.random() * pgStatements.length)];
        const pgDuration = random(5, 200);
        const isFailed = random(1, 10) === 1;
        const pgSpan = ordersApi
          .span({ spanName: stmt, spanType: 'db', spanSubtype: 'postgresql' })
          .timestamp(timestamp + 2)
          .duration(pgDuration)
          .destination('postgresql')
          .defaults({
            'service.target.type': 'postgresql',
            'service.target.name': 'orders-db',
          });
        if (isFailed) {
          return ordersApi
            .transaction({ transactionName: 'GET /internal/orders' })
            .timestamp(timestamp)
            .duration(pgDuration + 5)
            .failure()
            .children(pgSpan.failure());
        }
        return ordersApi
          .transaction({ transactionName: 'GET /internal/orders' })
          .timestamp(timestamp)
          .duration(pgDuration + 5)
          .success()
          .children(pgSpan.success());
      });

      // ─── Dependency edge: orders-api → redis ────────────────────────────────
      // 25 distinct commands. ~5% failure rate.
      const redisGenerators = range.ratePerMinute(40).generator((timestamp) => {
        const cmd = redisCommands[Math.floor(Math.random() * redisCommands.length)];
        const redisDuration = random(1, 20);
        const isFailed = random(1, 20) === 1;
        const redisSpan = ordersApi
          .span({ spanName: cmd, spanType: 'db', spanSubtype: 'redis' })
          .timestamp(timestamp + 1)
          .duration(redisDuration)
          .destination('redis')
          .defaults({
            'service.target.type': 'redis',
            'service.target.name': 'orders-cache',
          });
        if (isFailed) {
          return ordersApi
            .transaction({ transactionName: 'GET /internal/orders' })
            .timestamp(timestamp)
            .duration(redisDuration + 2)
            .failure()
            .children(redisSpan.failure());
        }
        return ordersApi
          .transaction({ transactionName: 'GET /internal/orders' })
          .timestamp(timestamp)
          .duration(redisDuration + 2)
          .success()
          .children(redisSpan.success());
      });

      // ─── Dependency edge: orders-api → kafka (messaging, no RED metrics) ────
      // Tests the empty-state / is-messaging-consumer path in the flyout.
      const kafkaGenerators = range.ratePerMinute(10).generator((timestamp) =>
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

      return withClient(
        apmEsClient,
        logger.perf('generating_service_map_stress_events', () => [
          ...backgroundGenerators,
          focusGenerators,
          pgGenerators,
          redisGenerators,
          kafkaGenerators,
        ])
      );
    },
  };
};

export default scenario;
