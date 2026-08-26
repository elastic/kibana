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
} from '../../../src/data_generators/replay';
import { GCS_BUCKET } from '../../../src/scenarios/constants';
import { evaluate } from '../evaluate';

const PAYMENT_FAILURE_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/payment-service-failures',
};

const SNAPSHOT_NAME = 'payment-service-failures';

evaluate.describe(
  'Investigation Skill: Payment Failure',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying payment-service-failures scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        PAYMENT_FAILURE_GCS
      );
    });

    evaluate('investigates payment failure scenario', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'payment-failure investigation',
          description:
            'Evaluates whether the agent correctly investigates the otel-demo paymentFailure scenario, where the payment service throws application errors rather than being unreachable.',
          examples: [
            {
              input: {
                question: 'Users are reporting that checkout is failing. Can you investigate?',
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
                  'Identifies the payment service as the root cause rather than checkout or frontend, which are showing cascade errors',
                  'Identifies this as an application-level error in payment charge logic — the service is reachable and receiving requests, not unavailable or unreachable',
                  'Cites the error message as evidence: references "Payment request failed", "Invalid token", or an error originating in the payment charge function',
                  'Notes that checkout and frontend failures are downstream symptoms of the payment error, not independent root causes',
                  'Does not incorrectly conclude the payment service is unreachable, experiencing a network failure, or a DNS/connectivity issue',
                  'Notices the app.loyalty.level=gold attribute on failing payment transactions or references gold loyalty tier as a signal present in the error data',
                ],
                expectedTools: [
                  'observability.get_services',
                  'observability.get_service_topology',
                  'observability.get_traces',
                ],
              },
              metadata: {
                expectedSkill: 'investigation',
              },
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
