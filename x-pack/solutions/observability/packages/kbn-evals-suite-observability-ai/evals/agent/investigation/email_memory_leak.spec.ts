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

const EMAIL_MEMORY_LEAK_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/email-memory-leak-100x',
};

const SNAPSHOT_NAME = 'email-memory-leak-100x';

evaluate.describe(
  'Investigation Skill: Email Memory Leak',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying email-memory-leak scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        EMAIL_MEMORY_LEAK_GCS
      );
    });

    evaluate('investigates email memory leak scenario', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'email-memory-leak investigation',
          description:
            'Evaluates whether the agent correctly investigates a memory leak in the email service (emailMemoryLeak feature flag). The email service accumulates memory on every order confirmation: it never clears its deliveries array and pads each email body by a large multiplier. The service has no error rate — it sends emails successfully. The leak is silent until the process OOMs. This tests whether the agent can identify a resource/memory issue in the absence of obvious service errors.',
          examples: [
            {
              input: {
                question:
                  'The email service appears to be consuming increasing amounts of memory. Can you investigate what might be causing it?',
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
                  'Identifies the email service as the affected component',
                  'Identifies this as a memory or resource accumulation issue, not a service error or availability failure',
                  'Notes that the email service has no error rate — it is sending emails successfully',
                  'Links the memory growth to order confirmation email sending — each checkout triggers an email that contributes to the accumulation',
                  'Does not incorrectly conclude the email service is down or that checkout is failing',
                  'If process-level memory metrics for the email service are not present in the telemetry, correctly identifies this gap rather than fabricating or misattributing memory data from other sources. If memory metrics are present, this criterion does not apply.',
                ],
                expectedTools: ['observability.get_services', 'observability.get_traces'],
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
