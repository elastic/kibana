/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { LoadResult } from '@kbn/es-snapshot-loader';
import {
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../../src/data_generators/replay';
import { GCS_BUCKET } from '../../src/scenarios/constants';
import { evaluate } from './evaluate';

const PAYMENT_UNREACHABLE_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/payment-unreachable',
};

const SNAPSHOT_NAME = 'payment-unreachable';

evaluate.describe(
  'Payment Unreachable Investigation',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying payment-unreachable scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        PAYMENT_UNREACHABLE_GCS
      );
    });

    evaluate('investigates payment unreachable investigation', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'payment-unreachable investigation',
          description:
            'Evaluates whether the agent correctly investigates a checkout service failure caused by the payment service being unreachable',
          examples: [
            {
              input: {
                question: 'Investigate what is causing issues with the checkout service.',
                attachments: [
                  {
                    type: 'screen_context',
                    data: {
                      app: 'observability-overview',
                      url: 'http://localhost:5601/app/observability/overview',
                      time_range: { from: 'now-15m', to: 'now' },
                    },
                    hidden: true,
                  },
                ],
              },
              output: {
                criteria: [
                  'Identifies that the payment service is unreachable or unavailable as the root cause',
                  'Recognizes that the failure is a connectivity or dependency issue (connection refused, DNS resolution failure, gRPC unavailable) rather than an error in application code',
                  'Cites the specific error message as evidence: "name resolver error: produced zero addresses" or equivalent gRPC unavailable error',
                  'Notes that the payment service has a 100% error rate while all other downstream dependencies (cart, currency, shipping, product-catalog) are healthy — the contrast isolates the problem',
                  'Notes that the failure is instant (very low latency, microseconds) indicating connection refusal rather than a timeout',
                  'Identifies the checkout service as the service experiencing the symptoms (failed transactions) but not the root cause',
                  'Suggests investigating payment service availability, network connectivity, or DNS as next steps',
                  'Does not incorrectly blame other services (frontend, cart, currency, shipping, product-catalog) as the root cause',
                  'Does not confidently state that the payment service is down or not running as a matter of fact',
                  'Enumerates multiple possible causes consistent with the observed evidence rather than asserting a single confident cause, when the evidence is ambiguous about which specific failure mode is occurring',
                  'Reports concrete counts of failed operations (e.g., number of failed transactions, exception occurrences, or affected requests) alongside rates or percentages, not just percentages alone',
                  'Notes the duration, onset, or temporal pattern of the issue (e.g., when it started, whether it is sustained, intermittent, or recent) rather than describing the failure as if it were a single instant snapshot',
                  'Interprets the metrics behaviorally (e.g., "checkout is completely unable to place orders", "the call fails at the connection layer") rather than only restating raw rates like "100% error rate"',
                ],
                expectedTools: [
                  'observability.get_service_topology',
                  'observability.get_log_groups',
                  'observability.get_traces',
                ],
              },
              metadata: { expectedSkill: 'investigation' },
            },
          ],
        },
      });
    });

    evaluate.afterAll(async ({ esClient, log }) => {
      log.debug('Cleaning up');
      await cleanObservabilityDataStreams(esClient, replayResult, log);
    });
  }
);
