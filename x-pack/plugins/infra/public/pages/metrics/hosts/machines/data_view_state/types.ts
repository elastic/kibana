/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import type { ActorRef } from 'xstate';
import { NotificationChannel } from '../../../../../observability_logs/xstate_helpers';
import { type DataViewNotificationEvent } from './notifications';

export interface DataViewContextWithIndexPattern {
  indexPattern: string;
}

export interface DataViewContextWithDataView {
  dataView: DataView;
}

export type DataViewContextWithError = DataViewContextWithIndexPattern & {
  error: Error;
};

export type DataViewTypestate =
  | {
      value: 'uninitialized';
      context: { indexPattern: string };
    }
  | {
      value: 'loading';
      context: {};
    }
  | {
      value: 'dataViewLoaded';
      context: DataViewContextWithDataView & DataViewContextWithIndexPattern;
    }
  | {
      value: 'loadingFailed';
      context: DataViewContextWithError & DataViewContextWithIndexPattern;
    };

export type DataViewContext = DataViewTypestate['context'];

export type DataViewStateValue = DataViewTypestate['value'];

export type DataViewEvent =
  | {
      type: 'LOADING_SUCCEEDED';
      dataView: DataView;
    }
  | {
      type: 'LOADING_FAILED';
      error: Error;
    };

export type DataViewActorRef = ActorRef<DataViewEvent, DataViewContext>;
export type DataViewNotificationChannel = NotificationChannel<
  DataViewContext,
  DataViewEvent,
  DataViewNotificationEvent
>;
