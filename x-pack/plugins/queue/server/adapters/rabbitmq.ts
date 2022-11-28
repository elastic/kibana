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
import type { PluginSetupDeps, PluginStartDeps, Job } from '../plugin';

const queueName = 'kibana';
const channelPromise = (async () => {
  const connection = await amqp.connect('amqp://guest:guest@localhost', {});
  const channel = await connection.createChannel();
  return channel;
})();
const confirmChannelPromise = (async () => {
  const connection = await amqp.connect('amqp://guest:guest@localhost', {});
  const channel = await connection.createConfirmChannel();
  await channel.assertQueue(queueName, { durable: false });
  return channel;
})();

export function registerWorkerAdapter(worker: Worker<unknown>, plugins: PluginSetupDeps) {
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const channel = await channelPromise;
    // channel.prefetch(10); // max workers
    channel.consume(
      queueName,
      async (msg) => {
        if (!msg) return;
        const params = JSON.parse(msg.content.toString());
        const abortController = new AbortController();
        await worker.run(params, abortController.signal);
        channel.ack(msg);
      },
      { noAck: false }
    );
  })();
}

export async function enqueueAdater(job: Job<unknown>, plugins: PluginStartDeps) {
  const message = Buffer.from(JSON.stringify(job.params));
  const channel = await confirmChannelPromise;
  // Both lines below in one shot?
  channel.sendToQueue(queueName, message);
  await channel.waitForConfirms();
}

export async function bulkEnqueueAdapter(jobs: Array<Job<unknown>>, plugins: PluginStartDeps) {
  const channel = await confirmChannelPromise;
  jobs.forEach((job) => {
    const message = Buffer.from(JSON.stringify(job.params));
    // Both lines below in one shot?
    channel.sendToQueue(queueName, message);
  });
  await channel.waitForConfirms();
}
