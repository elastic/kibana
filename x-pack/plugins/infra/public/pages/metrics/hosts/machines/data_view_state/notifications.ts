/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { createNotificationChannel } from '../../../../../observability_logs/xstate_helpers';
import { DataViewContext, DataViewEvent } from './types';

export type DataViewNotificationEvent =
  | {
      type: 'LOADING_DATA_VIEW_STARTED';
    }
  | {
      type: 'LOADING_DATA_VIEW_SUCCEEDED';
      dataView: DataView;
    }
  | {
      type: 'LOADING_DATA_VIEW_FAILED';
      error: Error;
    };

export const createDataViewNotificationChannel = () =>
  createNotificationChannel<DataViewContext, DataViewEvent, DataViewNotificationEvent>();

export const logViewNotificationEventSelectors = {
  loadingDataViewStarted: (context: DataViewContext) =>
    'logViewReference' in context
      ? ({
          type: 'LOADING_DATA_VIEW_STARTED',
        } as DataViewNotificationEvent)
      : undefined,

  loadingDataViewSucceeded: (context: DataViewContext) => {
    return 'dataView' in context && 'indexPattern' in context
      ? ({
          type: 'LOADING_DATA_VIEW_SUCCEEDED',
          dataView: context.dataView,
          indexPattern: context.indexPattern,
        } as DataViewNotificationEvent)
      : undefined;
  },
  loadingDataViewFailed: (context: DataViewContext) =>
    'error' in context
      ? ({
          type: 'LOADING_DATA_VIEW_FAILED',
          error: context.error,
          indexPattern: context.indexPattern,
        } as DataViewNotificationEvent)
      : undefined,
};
