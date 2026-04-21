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

const AD_SERVICE_HIGH_CPU_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/ad-high-cpu',
};

const SNAPSHOT_NAME = 'ad-high-cpu';

evaluate.describe(
  'Ad High CPU Investigation',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying ad-high-cpu scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        AD_SERVICE_HIGH_CPU_GCS
      );
    });

    evaluate('investigates ad service high CPU scenario', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ad-high-cpu investigation',
          description:
            'Evaluates whether the agent correctly investigates storefront slowness driven by high CPU load in the OpenTelemetry Demo ad service (adHighCpu feature flag)',
          examples: [
            {
              input: {
                question: 'The shop is slow when people look at ads and suggested items. Why?',
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
                  'Identifies the ad service (or Java ad workload) as the primary source of the slowdown, high CPU load, CPU-intensive behavior, or resource contention in that service, rather than blaming unrelated services without evidence',
                ],
                expectedTools: [
                  'observability.get_services',
                  'observability.get_trace_metrics',
                  'observability.get_runtime_metrics',
                  'observability.get_hosts',
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
