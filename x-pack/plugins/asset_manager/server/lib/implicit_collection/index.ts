/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { collectContainers, collectHosts, collectPods, collectServices } from './collectors';
import { CollectorRunner } from './collector_runner';

export interface ImplicitCollectionOptions {
  inputClient: ElasticsearchClient;
  outputClient: ElasticsearchClient;
  intervalMs: number;
  logger: Logger;
}

export function startImplicitCollection(options: ImplicitCollectionOptions): () => void {
  const runner = new CollectorRunner(options);
  runner.registerCollector('containers', collectContainers);
  runner.registerCollector('hosts', collectHosts);
  runner.registerCollector('pods', collectPods);
  runner.registerCollector('services', collectServices);

  const timer = setInterval(async () => {
    options.logger.info('Starting execution');
    await runner.run();
    options.logger.info('Execution ended');
  }, options.intervalMs);

  return () => {
    options.logger.debug('Stopping periodic collection');
    clearInterval(timer);
  };
}
