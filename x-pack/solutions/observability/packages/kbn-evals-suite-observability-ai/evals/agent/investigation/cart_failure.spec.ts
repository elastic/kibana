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

const CART_FAILURE_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/cart-failure',
};

const SNAPSHOT_NAME = 'cart-failure';

evaluate.describe(
  'Investigation Skill: Cart Failure',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying cart-failure scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        CART_FAILURE_GCS
      );
    });

    evaluate('investigates cart failure scenario', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'cart-failure investigation',
          description:
            'Evaluates whether the agent correctly investigates the otel-demo cartFailure scenario, where the cart service fails to clear carts after checkout due to a bad Valkey host.',
          examples: [
            {
              input: {
                question:
                  'We are seeing errors on the cart service. Can you investigate what is happening?',
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
                  'Identifies the cart service as the source of errors, not checkout or the Valkey instance itself',
                  'Identifies EmptyCart (cart clearing after checkout) as the specific failing operation, rather than concluding the cart service is broadly unavailable',
                  'Identifies the failure as a Valkey connectivity error — connection refused, connect timeout, or unreachable host — citing evidence from error messages or logs',
                  'Notes that other cart operations (GetCart, AddItemToCart) remain healthy — the fault is scoped to EmptyCart, not a full cart outage',
                  'Notes that checkout orders complete successfully — the impact is carts not being cleared post-checkout, not failed purchases',
                  'Does not incorrectly attribute the failure to the real Valkey instance being down or unavailable as a service-wide conclusion',
                ],
                expectedTools: [
                  'observability.get_services',
                  'observability.get_traces',
                  'observability.get_log_groups',
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
