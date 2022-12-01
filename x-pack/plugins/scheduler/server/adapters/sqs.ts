/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AWS from 'aws-sdk';
import type { Worker } from '../worker_registry';
import { PluginSetupDeps, PluginStartDeps, Job, Adapter } from '../plugin';

let sqs: AWS.SQS;
const workers: Record<string, Worker<unknown>> = {};
const QUEUE_URL = 'https://sqs.us-east-2.amazonaws.com/946960629917/ResponseOps-scheduler';
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
            console.log('SQS: Received message: ', JSON.stringify(data));
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
                    const params = {
                      MessageBody: JSON.stringify(job),
                      QueueUrl: QUEUE_URL,
                      DelaySeconds: job.interval / 1000,
                    };
                    await sqs.sendMessage(params).promise();
                    try {
                      await sqs
                        .deleteMessage({ QueueUrl: QUEUE_URL, ReceiptHandle: ReceiptHandle! })
                        .promise();
                    } catch (e) {
                      console.log('SQS: Failed to delete message:', e);
                    }
                  } catch (e) {
                    console.log('SQS: Failed to re-schedule job', e);
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
  scheduleAdapter: async (job: Job<unknown>, plugins: PluginStartDeps) => {
    const params = {
      MessageBody: JSON.stringify(job),
      QueueUrl: QUEUE_URL,
    };
    const result = await sqs.sendMessage(params).promise();
    console.log('SQS: Schedule result', JSON.stringify(result));
  },
  unscheduleAdapter: async (deduplicationId: string, plugins: PluginStartDeps) => {},
};
