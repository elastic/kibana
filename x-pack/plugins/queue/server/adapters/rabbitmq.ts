/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Need RabbitMQ running, use the following command
// docker run --rm -it --hostname my-rabbit -p 15672:15672 -p 5672:5672 rabbitmq:3-management

import amqp from 'amqplib';
import type { Worker } from '../worker_registry';
import type { Adapter, PluginSetupDeps, PluginStartDeps, Job } from '../plugin';

const QUEUE_NAME = 'kibana';
const workers: Array<Worker<unknown>> = [];
let channelPromise: Promise<amqp.ConfirmChannel>;

export const rabbitmqAdapter: Adapter = {
  setup() {
    channelPromise = (async () => {
      const connection = await amqp.connect('amqp://guest:guest@localhost', {});
      const channel = await connection.createConfirmChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: false });
      return channel;
    })();
  },
  start() {
    (async () => {
      const channel = await channelPromise;
      // channel.prefetch(10); // max workers
      workers.forEach((worker) => {
        channel.consume(
          QUEUE_NAME,
          async (msg) => {
            if (!msg) return;
            const params = JSON.parse(msg.content.toString());
            const abortController = new AbortController();
            await worker.run(params, abortController.signal);
            channel.ack(msg);
          },
          { noAck: false }
        );
      });
    })();
  },
  registerWorkerAdapter: (worker: Worker<unknown>, plugins: PluginSetupDeps) => {
    workers.push(worker);
  },
  enqueueAdater: async (job: Job<unknown>, plugins: PluginStartDeps) => {
    const message = Buffer.from(JSON.stringify(job.params));
    const channel = await channelPromise;
    // Both lines below in one shot?
    channel.sendToQueue(QUEUE_NAME, message);
    await channel.waitForConfirms();
  },
  bulkEnqueueAdapter: async (jobs: Array<Job<unknown>>, plugins: PluginStartDeps) => {
    const channel = await channelPromise;
    jobs.forEach((job) => {
      const message = Buffer.from(JSON.stringify(job.params));
      // Both lines below in one shot?
      channel.sendToQueue(QUEUE_NAME, message);
    });
    await channel.waitForConfirms();
  },
};
