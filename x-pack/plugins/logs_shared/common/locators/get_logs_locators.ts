/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NODE_LOGS_LOCATOR_ID,
  NodeLogsLocatorParams,
  TRACE_LOGS_LOCATOR_ID,
  TraceLogsLocatorParams,
} from '@kbn/deeplinks-observability';
import { UrlService } from '@kbn/share-plugin/common/url_service';
import { LOGS_LOCATOR_ID } from './logs_locator';
import { LogsLocatorParams } from './types';

export const getLogsLocatorsFromUrlService = (urlService: UrlService) => {
  const logsLocator = urlService.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID)!;
  const nodeLogsLocator = urlService.locators.get<NodeLogsLocatorParams>(NODE_LOGS_LOCATOR_ID)!;
  const traceLogsLocator = urlService.locators.get<TraceLogsLocatorParams>(TRACE_LOGS_LOCATOR_ID)!;

  return {
    logsLocator,
    traceLogsLocator,
    nodeLogsLocator,
  };
};
