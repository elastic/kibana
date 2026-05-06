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

const KAFKA_QUEUE_PROBLEMS_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/kafka-queue-problems',
};

const SNAPSHOT_NAME = 'kafka-queue-problems';

evaluate.describe(
  'Kafka Queue Problems Investigation',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      log.info('Replaying kafka-queue-problems scenario data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        KAFKA_QUEUE_PROBLEMS_GCS
      );
    });

    evaluate('investigates kafka queue problems', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'kafka-queue-problems investigation',
          description:
            'Evaluates whether the agent correctly investigates a Kafka message pipeline problem where the checkout service is flooding the "orders" topic with excessive messages and the fraud-detection consumer is processing them extremely slowly',
          examples: [
            {
              input: {
                question:
                  'Fraud-detection service seems to be running slowly. Can you investigate why?',
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
                  'Identifies the fraud-detection service as a slow consumer on the Kafka "orders" topic, attributing the slowness to the consumer side rather than blaming the Kafka broker itself',
                  'Discovers the upstream producer: identifies checkout as the service producing messages to the Kafka "orders" topic, either through topology exploration of the broker resource or through log analysis',
                  'Identifies a throughput mismatch: checkout produces messages at a much higher rate than fraud-detection can consume them, creating a growing backlog on the Kafka "orders" topic',
                  'Discovers from checkout logs that the service is sending excessive Kafka messages per order, with log evidence such as "overloading queue now" or "Done with #100 messages for overload simulation"',
                  'Suggests investigating both why checkout is sending excessive duplicate Kafka messages and why fraud-detection has a delay in its consumer loop',
                ],
                expectedTools: [
                  'observability.get_services',
                  'observability.get_service_topology',
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
