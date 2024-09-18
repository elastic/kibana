/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from '@kbn/logs-explorer-plugin/common';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import { InvokeCreator } from 'xstate';
import type { ObservabilityLogsExplorerContext, ObservabilityLogsExplorerEvent } from './types';

export const initializeAllSelection =
  ({
    logSourcesService,
  }: {
    logSourcesService: LogSourcesService;
  }): InvokeCreator<ObservabilityLogsExplorerContext, ObservabilityLogsExplorerEvent> =>
  async (context) => {
    const logSources = await logSourcesService.getLogSources();
    const indices = logSources.map((logSource) => logSource.indexPattern).join(',');
    return AllDatasetSelection.create({ indices });
  };
