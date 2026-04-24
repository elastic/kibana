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

const SERVICE_MAP_CRITERIA = [
  'Renders a service-map attachment inline rather than only describing the topology in prose',
  'Uses a service-map attachment (`observability.service-map`) rather than a generic graph attachment',
];

evaluate.describe('Service Map Skill', { tag: tags.serverless.observability.complete }, () => {
  let replayResult: LoadResult;

  evaluate.beforeAll(async ({ esClient, log }) => {
    log.info('Replaying payment-unreachable scenario data for service map eval');
    replayResult = await replayObservabilityDataStreams(
      esClient,
      log,
      SNAPSHOT_NAME,
      PAYMENT_UNREACHABLE_GCS
    );
  });

  evaluate(
    'activates service-map skill and creates attachment for visual topology requests',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'service-map skill activation',
          description:
            'Validates that requests to visualize service topology activate the service-map skill, call get_service_topology, and create a service-map attachment',
          examples: [
            {
              input: {
                question: 'Show me the service map for checkout',
              },
              output: {
                criteria: SERVICE_MAP_CRITERIA,
                expectedTools: ['observability.get_service_topology', 'attachments.add'],
              },
              metadata: {
                expectedSkill: 'service-map',
              },
            },
            {
              input: {
                question: 'Visualize the topology around the payment service',
              },
              output: {
                criteria: SERVICE_MAP_CRITERIA,
                expectedTools: ['observability.get_service_topology', 'attachments.add'],
              },
              metadata: {
                expectedSkill: 'service-map',
              },
            },
            {
              input: {
                question: 'Show the service map for frontend',
              },
              output: {
                criteria: SERVICE_MAP_CRITERIA,
                expectedTools: ['observability.get_service_topology', 'attachments.add'],
              },
              metadata: {
                expectedSkill: 'service-map',
              },
            },
            {
              input: {
                question: 'Map out the dependencies for the cart service',
              },
              output: {
                criteria: SERVICE_MAP_CRITERIA,
                expectedTools: ['observability.get_service_topology', 'attachments.add'],
              },
              metadata: {
                expectedSkill: 'service-map',
              },
            },
          ],
        },
      });
    }
  );

  evaluate.afterAll(async ({ esClient, log }) => {
    log.debug('Cleaning up');
    await cleanObservabilityDataStreams(esClient, replayResult, log);
  });
});
