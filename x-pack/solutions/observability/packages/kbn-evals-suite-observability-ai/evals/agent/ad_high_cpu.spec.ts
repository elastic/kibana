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
            'Evaluates whether the agent correctly investigates shop slowness driven by high CPU load in the OpenTelemetry Demo ad service when the `adHighCpu` feature flag is enabled (CPU burn runs at the start of each GetAds request)',
          examples: [
            {
              input: {
                question:
                  'Product pages are intermittently slow when loading ads and recommendations. There are no obvious errors reported. Investigate and determine what is causing the latency.',
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
                  'Identifies the `ad` service as the primary source of latency, supported by evidence (e.g., elevated CPU usage, slow spans, or runtime metrics), rather than attributing the issue to unrelated services',
                  'Explains the causal chain from user symptom (slow product pages)',
                  'Uses concrete observability signals (e.g., service metrics, trace latency, runtime/host CPU) to support conclusions, not speculation alone',
                  'Frames the issue as compute/resource saturation within the `ad` service',
                  'Correctly treats increased latency in upstream services (e.g., frontend, recommendation) as symptoms of the `ad` service slowdown when supported by traces or topology',
                  'Does not attribute the issue to unrelated domains (e.g., checkout, payment, cart) without supporting evidence',
                ],
                expectedTools: [
                  'observability.get_services',
                  'observability.get_traces',
                  'observability.get_runtime_metrics',
                  'observability.get_service_topology',
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
