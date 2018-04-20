/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Esqueue } from './esqueue';
import { createWorkersFactory } from './create_workers';
import { QUEUE_DOCTYPE } from '../../common/constants';
import { oncePerServer } from './once_per_server';
import { createTaggedLogger } from './create_tagged_logger';

const dateSeparator = '.';

function createQueueFn(server) {
  const queueConfig = server.config().get('xpack.reporting.queue');
  const index = server.config().get('xpack.reporting.index');
  const createWorkers = createWorkersFactory(server);
  const { getClient } = server.plugins.elasticsearch.getCluster('admin');

  const queueOptions = {
    doctype: QUEUE_DOCTYPE,
    interval: queueConfig.indexInterval,
    timeout: queueConfig.timeout,
    dateSeparator: dateSeparator,
    client: getClient(),
    logger: createTaggedLogger(server, ['reporting', 'esqueue'])
  };

  const queue = new Esqueue(index, queueOptions);

  createWorkers(queue);

  return queue;
}

export const createQueueFactory = oncePerServer(createQueueFn);
