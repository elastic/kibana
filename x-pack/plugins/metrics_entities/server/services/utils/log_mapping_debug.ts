/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '../../../../../../src/core/server';

export const logMappingDebug = ({
  logger,
  id,
  message,
}: {
  logger: Logger;
  id: string;
  message: string;
}): void => {
  logger.debug(`mapping id: "${id}", ${message}`);
};
