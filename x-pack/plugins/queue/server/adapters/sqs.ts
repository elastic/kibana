/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// To create your own credentials, see https://github.com/elastic/infra/blob/master/docs/aws/aws-user-access.md#aws-console-access
// But you'll also need to copy the output (.aws/credentials file) and create a [default] alias too

// Sometimes Okta will need to re-generate an access token, you'll also need to copy it to [default]

// Need credentials created, start Kibana with the following command
// AWS_CONFIG_FILE=/Users/mikecote/.aws/credentials AWS_SDK_LOAD_CONFIG=1 yarn start

import AWS from 'aws-sdk';
import { chunk } from 'lodash';
import type { Worker } from '../worker_registry';
import type { PluginSetupDeps, PluginStartDeps, Job, Adapter } from '../plugin';

let sqs: AWS.SQS;
const workers: Record<string, Worker<unknown>> = {};
const QUEUE_URL = 'https://sqs.us-east-2.amazonaws.com/946960629917/ResponseOps';
const MAX_WORKERS = 10;

export const sqsAdapter: Adapter = {
  setup() {
    AWS.config.update({ region: 'us-east-2' });
    sqs = new AWS.SQS();
  },
  start() {
    for (let i = 0; i < MAX_WORKERS; i++) {
      (async () => {
        while (true) {
          try {
            const data = await sqs
              .receiveMessage({
                QueueUrl: QUEUE_URL,
                MaxNumberOfMessages: 10, // Up to 10 messages in the messages array
                VisibilityTimeout: 5 * 60, // 5 minute run timeout
                WaitTimeSeconds: 20, // Wait 20 seconds after queue is emtpy before stopping to look for messages
              })
              .promise();
            if (!data.Messages) {
              return;
            }
            await Promise.all(
              data.Messages.map(async (message) => {
                const { ReceiptHandle, Body } = message;
                const job = Body ? JSON.parse(Body) : {};
                const abortController = new AbortController();
                const worker = workers[job.workerId];
                try {
                  await worker.run(job.params, abortController.signal);
                  try {
                    await sqs
                      .deleteMessage({ QueueUrl: QUEUE_URL, ReceiptHandle: ReceiptHandle! })
                      .promise();
                  } catch (e) {
                    console.log('SQS: Failed to delete message:', e);
                  }
                } catch (e) {
                  console.log('SQS: Failed to run: ', e);
                }
              })
            );
          } catch (e) {
            console.log('SQS: Failed to get a message from SQS, will try again in 10s', e);
            await new Promise((resolve) => setTimeout(resolve, 10000));
            sqs = new AWS.SQS();
          }
        }
      })();
    }
  },
  registerWorkerAdapter: (worker: Worker<unknown>, plugins: PluginSetupDeps) => {
    workers[worker.id] = worker;
  },
  enqueueAdater: async (job: Job<unknown>, plugins: PluginStartDeps) => {
    const params = {
      MessageBody: JSON.stringify(job),
      QueueUrl: QUEUE_URL,
    };
    await sqs.sendMessage(params).promise();
  },
  bulkEnqueueAdapter: async (jobs: Array<Job<unknown>>, plugins: PluginStartDeps) => {
    const jobBatches = chunk(jobs, 10); // SQS batch limit
    await Promise.all(
      jobBatches.map(async (batch) => {
        const params = {
          QueueUrl: QUEUE_URL,
          Entries: batch.map((job, i) => ({
            Id: i.toString(),
            MessageBody: JSON.stringify(job),
          })),
        };
        const result = await sqs.sendMessageBatch(params).promise();
        console.log('SQS: Bulk enqueue result', JSON.stringify(result));
      })
    );
  },
};
