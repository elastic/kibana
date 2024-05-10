/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

cli()
  .then(() => logger.success('Done'))
  .catch((e) => logger.error(e));

async function cli(): Promise<void> {
  console.log('hi hi');
  logger.info(`hey hey`);
}
