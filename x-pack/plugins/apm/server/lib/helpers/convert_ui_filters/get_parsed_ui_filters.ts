/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { UIFilters } from '../../../../typings/ui_filters';

export function getParsedUiFilters({
  uiFilters,
  logger,
}: {
  uiFilters: string;
  logger: Logger;
}): UIFilters {
  try {
    return JSON.parse(uiFilters);
  } catch (error) {
    logger.error(error);
  }
  return {};
}
