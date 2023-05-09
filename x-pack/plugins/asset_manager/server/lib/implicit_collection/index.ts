/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';

interface ImplicitCollectionOptions {
  intervalMs: number;
  logger: Logger;
}

export function runImplicitCollection(options: ImplicitCollectionOptions) {
  setInterval(() => {
    options.logger.info('Starting execution of implicit collection');
  }, options.intervalMs);
}
