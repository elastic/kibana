/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimefilterContract } from '@kbn/data-plugin/public';
import { InvokeCreator } from 'xstate';
import { ObservabilityLogsExplorerContext, ObservabilityLogsExplorerEvent } from './types';

export const initializeFromTimeFilterService =
  ({
    timeFilterService,
  }: {
    timeFilterService: TimefilterContract;
  }): InvokeCreator<ObservabilityLogsExplorerContext, ObservabilityLogsExplorerEvent> =>
  (_context, _event) =>
  (send) => {
    const time = timeFilterService.getTime();
    const refreshInterval = timeFilterService.getRefreshInterval();

    send({
      type: 'INITIALIZED_FROM_TIME_FILTER_SERVICE',
      time,
      refreshInterval,
    });
  };
