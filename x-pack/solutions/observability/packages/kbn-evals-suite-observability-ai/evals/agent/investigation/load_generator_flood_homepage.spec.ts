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

const LOAD_GENERATOR_FLOOD_HOMEPAGE_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/load-generator-flood-homepage',
};

const SNAPSHOT_NAME = 'load-generator-flood-homepage';

evaluate.describe(
  'Investigation Skill: Load Generator Flood Homepage',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying load-generator-flood-homepage scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        LOAD_GENERATOR_FLOOD_HOMEPAGE_GCS
      );
    });

    evaluate('investigates load generator flood homepage scenario', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'load-generator-flood-homepage investigation',
          description:
            'Evaluates whether the agent correctly investigates a frontend traffic spike caused by the load generator flooding the homepage (loadGeneratorFloodHomepage feature flag). The load generator fires 100 GET / requests per task invocation, causing a large throughput spike on the frontend. There are no service errors — this is a traffic anomaly, not a failure. The agent should trace the spike back to the load generator rather than concluding a service is broken.',
          examples: [
            {
              input: {
                question:
                  'We are seeing a large spike in traffic to the frontend. Can you investigate what is causing it?',
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
                  'Identifies the load generator as the source of the traffic spike, not organic user load or a misconfigured service',
                  'Identifies the frontend homepage (GET / or the root path) as the target — the spike is on homepage requests specifically',
                  'Notes that error rates remain healthy — this is a traffic volume anomaly, not a service failure',
                  'Cites evidence from traces linking the spike to the load generator: references the load-generator service, user_flood_home spans, or the flood.count span attribute',
                  'Does not incorrectly conclude that a service is down, misconfigured, or throwing errors',
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
