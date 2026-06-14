/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * RCA Benchmark — Mode A baseline scenario.
 *
 * Simulates a payment-service outage in an OTel-demo-style environment.
 * Data is injected directly into Elasticsearch (no GCS, no synthtrace bootstrap)
 * so this spec runs standalone on any ES + Kibana instance.
 *
 * Fault: paymentservice pods stop accepting connections; checkoutservice calls
 * fail with gRPC "name resolver error: produced zero addresses".
 *
 * Ground truth: component=paymentservice, reason=service unreachable / connection refused.
 */

import { evaluate } from '../../src/evaluate';
import { indexScenarioData, cleanScenarioData } from '../../src/data/scenario_loader';
import type { ScenarioHandle } from '../../src/data/scenario_loader';

const DATA_STREAM = 'logs-rca-benchmark-payment-unreachable';

evaluate.describe('RCA Benchmark — Mode A: payment-unreachable', () => {
  let scenarioHandle: ScenarioHandle;

  evaluate.beforeAll(async ({ esClient, log }) => {
    log.info('Indexing payment-unreachable scenario data into ES');
    scenarioHandle = await indexScenarioData(esClient, log, {
      dataStream: DATA_STREAM,
      documents: buildPaymentUnreachableLogs(),
    });
  });

  evaluate('mode_a: identifies paymentservice as root cause', async ({ evaluateRcaDataset }) => {
    await evaluateRcaDataset({
      dataset: {
        name: 'rca-benchmark: otel-demo payment-unreachable (mode-a)',
        description:
          'Mode A baseline — direct Agent Builder conversation, no KI or sig-events setup. ' +
          'The checkoutservice fails because paymentservice is unreachable (connection refused). ' +
          'Expected: agent names paymentservice as root cause with evidence from logs.',
        examples: [
          {
            input: {
              question:
                'The checkout service is experiencing a high error rate. ' +
                'Investigate the root cause. Which component is responsible and why?',
              streamName: DATA_STREAM,
              timeRange: { from: 'now-30m', to: 'now' },
            },
            output: {
              groundTruth: {
                component: 'paymentservice',
                reason:
                  'Payment service is unreachable — gRPC connection refused or DNS resolution failure',
              },
              criteria: [
                'Recognizes that checkoutservice is the symptom bearer but not the root cause',
                'Does not blame frontend, cartservice, currencyservice, or shippingservice as the root cause',
              ],
            },
            metadata: {
              mode: 'a' as const,
              benchmark: 'otel-demo' as const,
              caseId: 'otel-demo/payment-unreachable',
            },
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ esClient, log }) => {
    log.debug('Cleaning up scenario data');
    await cleanScenarioData(esClient, log, scenarioHandle);
  });
});

/** Synthetic log corpus that simulates a paymentservice outage in OTel demo. */
function buildPaymentUnreachableLogs() {
  const now = Date.now();
  const min = (n: number) => now - n * 60_000;

  return [
    // checkoutservice — gRPC errors calling paymentservice
    ...Array.from({ length: 40 }, (_, i) => ({
      '@timestamp': new Date(min(28) + i * 40_000).toISOString(),
      'log.level': 'error',
      'service.name': 'checkoutservice',
      'message':
        'failed to charge the card: rpc error: code = Unavailable ' +
        'desc = name resolver error: produced zero addresses',
      'error.type': 'grpc_unavailable',
      'span.name': 'oteldemo.CheckoutService/PlaceOrder',
      'http.status_code': 500,
    })),
    // paymentservice — no logs (pods not running / not accepting connections)
    // checkoutservice — healthy calls to cartservice
    ...Array.from({ length: 25 }, (_, i) => ({
      '@timestamp': new Date(min(28) + i * 60_000).toISOString(),
      'log.level': 'info',
      'service.name': 'checkoutservice',
      'message': 'successfully retrieved cart',
      'span.name': 'oteldemo.CartService/GetCart',
    })),
    // cartservice — healthy
    ...Array.from({ length: 20 }, (_, i) => ({
      '@timestamp': new Date(min(28) + i * 70_000).toISOString(),
      'log.level': 'info',
      'service.name': 'cartservice',
      'message': 'GetCart succeeded',
    })),
    // frontend — 500s on /cart/checkout (downstream of checkoutservice failures)
    ...Array.from({ length: 35 }, (_, i) => ({
      '@timestamp': new Date(min(27) + i * 45_000).toISOString(),
      'log.level': 'warn',
      'service.name': 'frontend',
      'message': 'POST /cart/checkout → 500 Internal Server Error',
      'http.route': '/cart/checkout',
      'http.status_code': 500,
    })),
    // frontend — healthy page views
    ...Array.from({ length: 30 }, (_, i) => ({
      '@timestamp': new Date(min(28) + i * 50_000).toISOString(),
      'log.level': 'info',
      'service.name': 'frontend',
      'message': 'GET /product → 200 OK',
      'http.status_code': 200,
    })),
    // currencyservice — healthy
    ...Array.from({ length: 15 }, (_, i) => ({
      '@timestamp': new Date(min(28) + i * 90_000).toISOString(),
      'log.level': 'info',
      'service.name': 'currencyservice',
      'message': 'GetSupportedCurrencies OK',
    })),
  ];
}
