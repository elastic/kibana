/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One service that calls many external HTTP APIs, so the service map groups them into a single
 * "N resources" node and the edge to it is a grouped edge. The map never groups `db` or `cache`
 * dependencies (see NONGROUPED_SPANS), so redis/postgres instances can't be used for this.
 *
 * Used to try the request flyout of a grouped edge (resources table -> per-resource child flyout
 * -> operation / errors child flyouts).
 *
 * Topology:
 *   partner-gateway --> partner-orders-api --> partner-api-1 .. partner-api-N   (grouped node)
 *
 * With `extended` (default on) the map grows around that core. The core above is unchanged:
 *   partner-gateway --> partner-auth --> auth-cache (redis)
 *   partner-gateway --> partner-catalog --> catalog-db (postgresql), catalog-cache (redis)
 *                                       --> partner-search --> search-index (elasticsearch)
 *   partner-checkout --> partner-orders-api                        (service -> service)
 *                    --> payments                                  (service -> service, with caller, server and client failures)
 *                    --> payments.example.com                      (single external HTTP API)
 *                    --> orders-events (kafka)                     (messaging)
 *                    --> partner-notifications --> sms-provider-1 .. 5   (second grouped node)
 *                    --> partner-inventory --> carrier-api-1 .. 4        (grouped node, two callers)
 *                                          --> partner-warehouse --> warehouse-db (postgresql)
 *                                                                --> carrier-api-1 .. 4
 * Failed exit spans of the new services carry APM errors. db/cache dependencies are never grouped
 * by the map, so the groups are external HTTP APIs.
 *
 * Only partner-orders-api calls the partner APIs, so they all share the same source and are
 * grouped (the map groups 4 or more same-source dependencies). Each instance has its own volume,
 * latency and failure rate so the resources table has a meaningful order. Failed exit spans carry
 * an APM error and the service also emits OTel exception logs (log errors for the errors flyout).
 *
 * Run:
 *   node scripts/synthtrace x-pack/solutions/observability/plugins/apm/test/scenarios/service_map_edge_flyout.ts --from now-1h --to now \
 *     --scenarioOpts='{"resources":8}'
 *
 * Manual live run (optional, stop with Ctrl+C):
 *   node scripts/synthtrace x-pack/solutions/observability/plugins/apm/test/scenarios/service_map_edge_flyout.ts --live \
 *     --scenarioOpts='{"resources":8}'
 *
 * Scenario options:
 * - resources (number, default: 8, minimum 4): external APIs behind the grouped node
 * - rpm (number, default: 120): exit-span calls per minute to the busiest instance
 * - extended (0|1, default: 1): also generate the extra services around the core (see Topology)
 * - extraRpm (number, default: 30): requests per minute of each flow of the extra services
 * - core (0|1, default: 1): generate the core (gateway, orders-api, partner APIs, logs). Use 0 together
 *   with `extended` to add the extra services to data that already has the core, without doubling it
 *
 * Validation:
 * - POST traces-apm*\/_search filtered on service.name:"partner-orders-api" and
 *   span.destination.service.resource:"partner-api-*": terms agg on service.target.name returns
 *   `resources` buckets.
 */

import type { ApmFields, Instance, LogDocument, Timerange } from '@kbn/synthtrace-client';
import { apm, log } from '@kbn/synthtrace-client';
import type { RunOptions, Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment, withClient } from '@kbn/synthtrace';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const DEFAULT_SCENARIO_OPTS = { resources: 8, rpm: 120, extended: 1, extraRpm: 30, core: 1 };

const OPERATIONS = [
  'GET /v1/items',
  'POST /v1/orders',
  'GET /v1/prices',
  'PUT /v1/stock',
  'POST /v1/refunds',
];
const ERRORS = [
  { message: 'Partner API returned 503 Service Unavailable', type: 'PartnerUnavailableError' },
  { message: 'Connection pool exhausted', type: 'PoolExhaustedError' },
  { message: 'Partner API request timed out after 500ms', type: 'PartnerTimeoutError' },
];

const randomHex = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const EXTRA_ERRORS = {
  search: { message: 'Search index unavailable', type: 'SearchIndexError' },
  sms: { message: 'SMS provider rate limit exceeded', type: 'RateLimitError' },
  warehouse: { message: 'Warehouse DB deadlock detected', type: 'DeadlockError' },
  catalog: { message: 'Catalog item not found', type: 'ItemNotFoundError' },
};

const chance = (oneIn: number) => Math.floor(Math.random() * oneIn) === 0;
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * The extra services of the map. Everything here is added around the partner-orders-api core,
 * which is generated by the caller and not touched.
 */
function buildExtendedMapGenerators({
  range,
  rpm,
  gateway,
  orders,
}: {
  range: Timerange;
  rpm: number;
  gateway: Instance;
  orders: Instance;
}) {
  const instance = (name: string, agentName: string) =>
    apm.service({ name, environment: ENVIRONMENT, agentName }).instance(`${name}-1`);

  const auth = instance('partner-auth', 'opentelemetry/nodejs');
  const catalog = instance('partner-catalog', 'opentelemetry/python');
  const search = instance('partner-search', 'opentelemetry/java');
  const checkout = instance('partner-checkout', 'opentelemetry/go');
  const inventory = instance('partner-inventory', 'opentelemetry/java');
  const warehouse = instance('partner-warehouse', 'opentelemetry/dotnet');
  const notifications = instance('partner-notifications', 'opentelemetry/nodejs');
  const payments = instance('payments', 'opentelemetry/go');

  // db / cache exit span of `inst` (never grouped by the map)
  const dbSpan = (
    inst: Instance,
    spec: { name: string; subtype: string; resource: string },
    timestamp: number,
    duration: number,
    failed = false
  ) => {
    const span = inst
      .span({ spanName: spec.name, spanType: 'db', spanSubtype: spec.subtype })
      .timestamp(timestamp)
      .duration(duration)
      .destination(spec.resource)
      .defaults({ 'service.target.type': spec.subtype, 'service.target.name': spec.resource });
    return failed ? span.failure() : span.success();
  };

  // external HTTP exit span of `inst`, optionally with the transaction it reaches in another service
  const httpSpan = (
    inst: Instance,
    spec: { name: string; resource: string },
    timestamp: number,
    duration: number,
    failed = false,
    child?: ReturnType<Instance['transaction']>
  ) => {
    const span = inst
      .span({ spanName: spec.name, spanType: 'external', spanSubtype: 'http' })
      .timestamp(timestamp)
      .duration(duration)
      .destination(spec.resource)
      .defaults({ 'service.target.type': 'http', 'service.target.name': spec.resource });
    const outcome = failed ? span.failure() : span.success();
    return child ? outcome.children(child) : outcome;
  };

  const transaction = (
    inst: Instance,
    name: string,
    timestamp: number,
    duration: number,
    failed = false
  ) => {
    const tx = inst.transaction({ transactionName: name }).timestamp(timestamp).duration(duration);
    return failed ? tx.failure() : tx.success();
  };

  // the failed-calls query finds the top error through the id of the failed exit span
  const attachError = (
    tx: ReturnType<Instance['transaction']>,
    inst: Instance,
    span: { fields: ApmFields },
    error: { message: string; type: string },
    timestamp: number
  ) => {
    const apmError = inst.error(error).timestamp(timestamp);
    apmError.fields['span.id'] = span.fields['span.id'];
    tx.errors(apmError);
  };

  const carrier = () => `carrier-api-${between(1, 4)}.example.com`;
  const smsProviderIndex = () => {
    // different volume per provider so the group has a meaningful order
    const roll = Math.random();
    return roll < 0.4 ? 1 : roll < 0.65 ? 2 : roll < 0.82 ? 3 : roll < 0.93 ? 4 : 5;
  };

  // partner-gateway -> partner-auth -> auth-cache (service -> service -> redis)
  const authGen = range.ratePerMinute(rpm).generator((timestamp: number) => {
    const failed = chance(30);
    const authTx = transaction(auth, 'POST /auth/token', timestamp + 2, 12, failed).children(
      dbSpan(
        auth,
        { name: 'GET session:token', subtype: 'redis', resource: 'auth-cache' },
        timestamp + 3,
        2
      )
    );
    return transaction(gateway, 'POST /login', timestamp, 25, failed).children(
      httpSpan(
        gateway,
        { name: 'POST /auth/token', resource: 'partner-auth' },
        timestamp + 1,
        15,
        failed,
        authTx
      )
    );
  });

  // partner-gateway -> partner-catalog -> postgresql + redis, -> partner-search -> elasticsearch
  const catalogGen = range.ratePerMinute(rpm).generator((timestamp: number) => {
    const searchFailed = chance(8);
    const esSpan = dbSpan(
      search,
      { name: 'search products-index', subtype: 'elasticsearch', resource: 'search-index' },
      timestamp + 8,
      20,
      searchFailed
    );
    const searchTx = transaction(
      search,
      'GET /search/products',
      timestamp + 7,
      30,
      searchFailed
    ).children(esSpan);
    if (searchFailed) {
      attachError(searchTx, search, esSpan, EXTRA_ERRORS.search, timestamp + 10);
    }

    const catalogFailed = searchFailed || chance(20);
    const catalogTx = transaction(
      catalog,
      'GET /catalog/items',
      timestamp + 2,
      70,
      catalogFailed
    ).children(
      dbSpan(
        catalog,
        {
          name: 'SELECT * FROM products WHERE id = $1',
          subtype: 'postgresql',
          resource: 'catalog-db',
        },
        timestamp + 3,
        12
      ),
      dbSpan(
        catalog,
        { name: 'GET catalog:item', subtype: 'redis', resource: 'catalog-cache' },
        timestamp + 5,
        2
      ),
      httpSpan(
        catalog,
        { name: 'GET /search/products', resource: 'partner-search' },
        timestamp + 6,
        40,
        searchFailed,
        searchTx
      )
    );
    return transaction(gateway, 'GET /products', timestamp, 85, catalogFailed).children(
      httpSpan(
        gateway,
        { name: 'GET /catalog/items', resource: 'partner-catalog' },
        timestamp + 1,
        75,
        catalogFailed,
        catalogTx
      )
    );
  });

  // partner-checkout -> partner-orders-api, kafka, a single external API and partner-notifications
  // (-> sms-provider-1..5, a second grouped node)
  const checkoutGen = range.ratePerMinute(rpm).generator((timestamp: number) => {
    const smsIndex = smsProviderIndex();
    const smsFailed = chance(4 + smsIndex * 2);
    const smsHost = `sms-provider-${smsIndex}.example.com`;
    const smsSpan = httpSpan(
      notifications,
      { name: 'POST /v1/messages', resource: smsHost },
      timestamp + 12,
      18 + smsIndex * 6,
      smsFailed
    );
    const notificationsTx = transaction(
      notifications,
      'POST /notify',
      timestamp + 11,
      40,
      smsFailed
    ).children(smsSpan);
    if (smsFailed) {
      attachError(notificationsTx, notifications, smsSpan, EXTRA_ERRORS.sms, timestamp + 14);
    }

    return transaction(checkout, 'POST /checkout', timestamp, 120, smsFailed).children(
      httpSpan(
        checkout,
        { name: 'POST /orders', resource: 'partner-orders-api' },
        timestamp + 1,
        50,
        false,
        transaction(orders, 'POST /orders', timestamp + 2, 45)
      ),
      checkout
        .span({ spanName: 'orders-events publish', spanType: 'messaging', spanSubtype: 'kafka' })
        .timestamp(timestamp + 3)
        .duration(6)
        .destination('orders-events')
        .defaults({ 'service.target.type': 'kafka', 'service.target.name': 'orders-events' })
        .success(),
      httpSpan(
        checkout,
        { name: 'POST /v1/charges', resource: 'payments.example.com' },
        timestamp + 4,
        35,
        chance(15)
      ),
      httpSpan(
        checkout,
        { name: 'POST /notify', resource: 'partner-notifications' },
        timestamp + 10,
        45,
        smsFailed,
        notificationsTx
      )
    );
  });

  // partner-checkout -> partner-inventory -> carrier-api-1..4 (grouped node with two callers)
  //                                       -> partner-warehouse -> warehouse-db, carrier-api-1..4
  const inventoryGen = range.ratePerMinute(rpm).generator((timestamp: number) => {
    const warehouseFailed = chance(12);
    const warehouseDb = dbSpan(
      warehouse,
      {
        name: 'UPDATE stock SET quantity = $1 WHERE sku = $2',
        subtype: 'postgresql',
        resource: 'warehouse-db',
      },
      timestamp + 8,
      25,
      warehouseFailed
    );
    const warehouseTx = transaction(
      warehouse,
      'GET /warehouse/stock',
      timestamp + 7,
      60,
      warehouseFailed
    ).children(
      warehouseDb,
      httpSpan(
        warehouse,
        { name: 'GET /v1/rates', resource: carrier() },
        timestamp + 9,
        20,
        chance(10)
      )
    );
    if (warehouseFailed) {
      attachError(warehouseTx, warehouse, warehouseDb, EXTRA_ERRORS.warehouse, timestamp + 12);
    }

    const inventoryTx = transaction(
      inventory,
      'GET /inventory/stock',
      timestamp + 2,
      90,
      warehouseFailed
    ).children(
      httpSpan(
        inventory,
        { name: 'GET /v1/rates', resource: carrier() },
        timestamp + 3,
        25,
        chance(10)
      ),
      httpSpan(
        inventory,
        { name: 'GET /warehouse/stock', resource: 'partner-warehouse' },
        timestamp + 6,
        70,
        warehouseFailed,
        warehouseTx
      )
    );
    return transaction(checkout, 'GET /stock', timestamp, 100, warehouseFailed).children(
      httpSpan(
        checkout,
        { name: 'GET /inventory/stock', resource: 'partner-inventory' },
        timestamp + 1,
        95,
        warehouseFailed,
        inventoryTx
      )
    );
  });

  // partner-checkout -> payments, with the three kinds of failures of a service -> service edge:
  // caller (never reached payments, the error is attached through the parent id), server (payments
  // failed) and client (payments answered with a 4xx)
  const paymentsGen = range.ratePerMinute(rpm).generator((timestamp: number) => {
    const roll = Math.random();
    const outcome =
      roll < 0.6 ? 'success' : roll < 0.75 ? 'caller' : roll < 0.9 ? 'server' : 'client';
    const exit = checkout
      .span({ spanName: 'POST /charges', spanType: 'external', spanSubtype: 'http' })
      .destination('payments')
      .timestamp(timestamp + 1)
      .duration(outcome === 'caller' ? 500 : 80);
    const checkoutTx = transaction(checkout, 'POST /pay', timestamp, 120, outcome !== 'success');

    if (outcome === 'caller') {
      const error = checkout.error({ message: 'Payment request timed out', type: 'TimeoutError' });
      error.fields['parent.id'] = exit.fields['span.id'];
      return checkoutTx.children(exit.failure()).errors(error.timestamp(timestamp + 2));
    }

    const paymentsTx = transaction(
      payments,
      'POST /charges',
      timestamp + 2,
      60,
      outcome === 'server'
    );
    if (outcome === 'server') {
      paymentsTx.errors(
        payments
          .error({ message: 'Card processor unavailable', type: 'ProcessorError' })
          .timestamp(timestamp + 3)
      );
    }
    return checkoutTx.children(
      (outcome === 'success' ? exit.success() : exit.failure()).children(paymentsTx)
    );
  });

  return [authGen, catalogGen, checkoutGen, inventoryGen, paymentsGen];
}

const scenario: Scenario<ApmFields | LogDocument> = async (runOptions: RunOptions) => {
  const opts = {
    ...DEFAULT_SCENARIO_OPTS,
    ...(runOptions.scenarioOpts ?? {}),
  } as typeof DEFAULT_SCENARIO_OPTS;
  const unknown = Object.keys(runOptions.scenarioOpts ?? {}).filter(
    (k) => !(k in DEFAULT_SCENARIO_OPTS)
  );
  if (unknown.length) {
    throw new Error(`Unknown scenarioOpts: ${unknown.join(', ')}`);
  }
  const resources = Math.max(4, Number(opts.resources));
  const rpm = Number(opts.rpm);
  const extended = Number(opts.extended) !== 0;
  const core = Number(opts.core) !== 0;
  const extraRpm = Number(opts.extraRpm);

  const gateway = apm
    .service({ name: 'partner-gateway', environment: ENVIRONMENT, agentName: 'opentelemetry/go' })
    .instance('partner-gateway-1');
  const orders = apm
    .service({
      name: 'partner-orders-api',
      environment: ENVIRONMENT,
      agentName: 'opentelemetry/java',
    })
    .instance('partner-orders-api-1');

  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      // gateway -> orders-api keeps the grouped service from being an isolated node
      const gatewayGen = range.ratePerMinute(60).generator((timestamp: number) =>
        gateway
          .transaction({ transactionName: 'POST /checkout' })
          .timestamp(timestamp)
          .duration(60)
          .success()
          .children(
            gateway
              .span({ spanName: 'POST /orders', spanType: 'external', spanSubtype: 'http' })
              .destination('partner-orders-api')
              .timestamp(timestamp + 1)
              .duration(50)
              .success()
              .children(
                orders
                  .transaction({ transactionName: 'POST /orders' })
                  .timestamp(timestamp + 2)
                  .duration(45)
                  .success()
              )
          )
      );

      // One generator per partner API. Volume, latency and failure rate differ per instance.
      const partnerGens = Array.from({ length: resources }, (_, i) => {
        const instanceName = `partner-api-${i + 1}.example.com`;
        const instanceRpm = Math.max(10, Math.round(rpm / (1 + i * 0.4)));
        const failureOneIn = 4 + i * 3;
        const baseDuration = 2 + i * 6;

        return range.ratePerMinute(instanceRpm).generator((timestamp: number) => {
          const command = OPERATIONS[Math.floor(timestamp / 1000) % OPERATIONS.length];
          const isFailed = Math.floor(Math.random() * failureOneIn) === 0;
          const span = orders
            .span({ spanName: command, spanType: 'external', spanSubtype: 'http' })
            .timestamp(timestamp + 1)
            .duration(baseDuration + Math.floor(Math.random() * 10))
            .destination(instanceName)
            .defaults({ 'service.target.type': 'http', 'service.target.name': instanceName });
          const error = ERRORS[Math.floor(Math.random() * ERRORS.length)];

          const transaction = orders
            .transaction({ transactionName: 'GET /internal/partners' })
            .timestamp(timestamp)
            .duration(baseDuration + 12)
            [isFailed ? 'failure' : 'success']()
            .children(isFailed ? span.failure() : span.success());

          if (isFailed) {
            // The failed-calls query finds the top error through the id of the failed exit span.
            const apmError = orders.error(error).timestamp(timestamp + 2);
            apmError.fields['span.id'] = span.fields['span.id'];
            transaction.errors(apmError);
          }
          return transaction;
        });
      });

      // OTel exception logs of the service (errors from logs).
      const logGen = range.ratePerMinute(30).generator((timestamp: number) => {
        const error = ERRORS[Math.floor(Math.random() * ERRORS.length)];
        return log
          .create()
          .message(error.message)
          .logLevel('error')
          .service('partner-orders-api')
          .defaults({
            event_name: 'exception',
            'exception.type': error.type,
            'exception.message': error.message,
            'trace.id': randomHex(32),
            'span.id': randomHex(16),
          })
          .timestamp(timestamp);
      });

      // More services around the core above (the core itself is not changed).
      const extendedGens = extended
        ? buildExtendedMapGenerators({ range, rpm: extraRpm, gateway, orders })
        : [];

      return [
        ...(core
          ? [
              withClient(apmEsClient, gatewayGen),
              ...partnerGens.map((gen) => withClient(apmEsClient, gen)),
              withClient(logsEsClient, logGen),
            ]
          : []),
        ...extendedGens.map((gen) => withClient(apmEsClient, gen)),
      ];
    },
  };
};

export default scenario;
