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

export const sqsAdapter: Adapter = {
  setup() {
    AWS.config.update({ region: 'us-east-2' });
    sqs = new AWS.SQS();
  },
  start() {
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
                  const params = {
                    MessageBody: JSON.stringify(job),
                    QueueUrl: QUEUE_URL,
                    DelaySeconds: job.interval / 1000,
                    MessageDeduplicationId: job.deduplicationId,
                  };
                  await sqs.sendMessage(params).promise();
                  try {
                    await sqs
                      .deleteMessage({ QueueUrl: QUEUE_URL, ReceiptHandle: ReceiptHandle! })
                      .promise();
                  } catch (e) {
                    console.log('Failed to delete message:', e);
                  }
                } catch (e) {
                  console.log('Failed to re-schedule job', e);
                }
              } catch (e) {
                console.log('Failed to run: ', e);
              }
            })
          );
        } catch (e) {
          console.log('Failed to get a message from SQS', e);
          // Exit while true
          throw e;
        }
      }
    })();
  },
  registerWorkerAdapter: (worker: Worker<unknown>, plugins: PluginSetupDeps) => {
    workers[worker.id] = worker;
  },
  scheduleAdapter: async (job: Job<unknown>, plugins: PluginStartDeps) => {
    const params = {
      MessageBody: JSON.stringify(job),
      QueueUrl: QUEUE_URL,
      MessageDeduplicationId: job.deduplicationId,
    };
    await sqs.sendMessage(params).promise();
  },
  unscheduleAdapter: async (deduplicationId: string, plugins: PluginStartDeps) => {},
};
