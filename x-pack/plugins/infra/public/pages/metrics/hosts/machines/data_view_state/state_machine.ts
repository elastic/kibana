/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { catchError, from, map, of, throwError } from 'rxjs';
import { createMachine, actions, assign } from 'xstate';
import { NotificationChannel } from '../../../../../observability_logs/xstate_helpers';
import { DataViewNotificationEvent, logViewNotificationEventSelectors } from './notifications';
import {
  DataViewContext,
  DataViewContextWithError,
  DataViewContextWithDataView,
  DataViewEvent,
  DataViewTypestate,
  DataViewContextWithIndexPattern,
} from './types';

export const createPureDataViewStateMachine = (initialContext: DataViewContextWithIndexPattern) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVA1AlmA7gHQCuAdjuejqgDY4BekAxANoAMAuoqAA4D2sHFT6luIAB6IAjAA4AzIRlSATAFY2AFlXKAbHI1TVAdgA0IAJ7TlGwqvn6j+tkZmO5AX3dm0mXAUI0fKgQFFBMADIA8gCCyACSAHIA4gD6AMoAqgDCWQCiucgF7FxIIPyCwqKlkgiqcqq2qhpGbACcrho6TaYWiEq2yvoaykayjuoeXiA+2HhEgcGhETHxySkAYtFx4UWcYuVCOCJiNXU6ikqqrXKtqk1sUq1mlgjKsoRyI1JdcmxtUkZlMpPFNSHwIHAxDM-Ph9gJDsdqogALQ6Z4ohqtLHYnE4ybeDCzfxkCiHWgMSBwipHKqgGrDdEIFQKOxyOQ6AytDRsNQPTwE3xzAJBEKkKBUhG0iSIEYyRTtDQGDRKa46IwaRmuQhsewaLltQHWHT86aEmGECBmubhEWU0oHSonRBGLqEKRtG7cxwybRyTVSWx-B4yEae77402C-wLUVQdaoHA0O28eGOpEIIyAi6dGRq0ZyKSKxnKZzanl6qQ3OyaYEgoA */
  createMachine<DataViewContext, DataViewEvent, DataViewTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DataView',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'loading',
          },
        },
        loading: {
          entry: ['notifyLoadingStarted'],
          invoke: {
            src: 'loadDataView',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'dataViewLoaded',
              actions: 'storeDataView',
            },
            LOADING_FAILED: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        dataViewLoaded: {
          entry: ['notifyLoadingSucceeded'],
        },
        loadingFailed: {
          entry: 'notifyLoadingFailed',
        },
      },
    },
    {
      actions: {
        notifyLoadingStarted: actions.pure(() => undefined),
        notifyLoadingSucceeded: actions.pure(() => undefined),
        notifyLoadingFailed: actions.pure(() => undefined),
        storeDataView: assign((context, event) => {
          return 'dataView' in event
            ? ({
                dataView: event.dataView,
              } as DataViewContextWithDataView)
            : {};
        }),
        storeError: assign((context, event) =>
          'error' in event
            ? ({
                error: event.error,
              } as DataViewContextWithError)
            : {}
        ),
      },
    }
  );

export interface DataViewStateMachineDependencies {
  initialContext: DataViewContextWithIndexPattern;
  dataViews: DataViewsPublicPluginStart;
  notificationChannel?: NotificationChannel<
    DataViewContext,
    DataViewEvent,
    DataViewNotificationEvent
  >;
}

export const createDataViewStateMachine = ({
  initialContext,
  dataViews,
  notificationChannel,
}: DataViewStateMachineDependencies) =>
  createPureDataViewStateMachine(initialContext).withConfig({
    actions: {
      ...(notificationChannel != null
        ? {
            notifyLoadingStarted: notificationChannel.notify(
              logViewNotificationEventSelectors.loadingDataViewFailed
            ),
            notifyLoadingSucceeded: notificationChannel.notify(
              logViewNotificationEventSelectors.loadingDataViewSucceeded
            ),
            notifyLoadingFailed: notificationChannel.notify(
              logViewNotificationEventSelectors.loadingDataViewFailed
            ),
          }
        : {}),
    },
    services: {
      loadDataView: (context) =>
        from(
          'indexPattern' in context
            ? dataViews.get(context.indexPattern, false).catch(() =>
                // if data view doesn't exist, create an ad-hoc one
                dataViews.create({
                  id: generateDataViewId(context.indexPattern),
                  title: context.indexPattern,
                  timeFieldName: '@timestamp',
                })
              )
            : throwError(() => {
                new Error('Failed to load data view');
              })
        ).pipe(
          map((dataView): DataViewEvent => {
            return {
              type: 'LOADING_SUCCEEDED',
              dataView,
            };
          }),
          catchError((error) => {
            return of<DataViewEvent>({
              type: 'LOADING_FAILED',
              error,
            });
          })
        ),
    },
  });

export const DATA_VIEW_PREFIX = 'infra_metrics';
export const generateDataViewId = (index: string) => {
  // generates a unique but the same uuid as long as the index pattern doesn't change
  return `${DATA_VIEW_PREFIX}_${uuidv5(index, uuidv5.URL)}`;
};
