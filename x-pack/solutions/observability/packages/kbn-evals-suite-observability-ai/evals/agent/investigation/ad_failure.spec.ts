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

const AD_FAILURE_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/ad-failure',
};

const SNAPSHOT_NAME = 'ad-failure';

evaluate.describe(
  'Investigation Skill: Ad Service Failure',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying ad-failure scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        AD_FAILURE_GCS
      );
    });

    evaluate('investigates ad service failure scenario', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ad-failure investigation',
          description:
            'Evaluates whether the agent correctly investigates the otel-demo adFailure scenario, where the ad service returns errors on approximately 10% of requests while remaining reachable.',
          examples: [
            {
              input: {
                question:
                  'Users are reporting that product pages sometimes load without ads. Can you investigates it?',
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
                  'Identifies the ad service as the source of the errors, not the frontend or another upstream service',
                  'Identifies this as an intermittent error rate (~10%) rather than a total outage — the service is reachable and handling the majority of requests successfully',
                  'Identifies the error type as a service-level failure (gRPC UNAVAILABLE or equivalent application error), not a network, DNS, or connectivity issue — the high success rate on remaining requests is the evidence',
                  'Frames an internal/service-level cause as the top hypothesis, not an external dependency',
                  'Recommends investigating ad service internals (logs, code path returning UNAVAILABLE, recent deployments, or configuration changes) as a concrete next step',
                  'Does not incorrectly conclude the ad service is down, unreachable, or that user purchases are failing',
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
