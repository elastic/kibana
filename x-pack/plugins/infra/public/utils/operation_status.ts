/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import last from 'lodash/fp/last';

export interface InProgressStatus<O extends Operation<string, any>> {
  operation: O;
  status: 'in-progress';
  time: number;
}

export interface SucceededStatus<O extends Operation<string, any>> {
  operation: O;
  status: 'succeeded';
  time: number;
}

export interface FailedStatus<O extends Operation<string, any>> {
  message: string;
  operation: O;
  status: 'failed';
  time: number;
}

const isFailedStatus = <O extends Operation<string, any>>(
  status: OperationStatus<O>
): status is FailedStatus<O> => status.status === 'failed';

export type OperationStatus<O extends Operation<string, any>> =
  | InProgressStatus<O>
  | SucceededStatus<O>
  | FailedStatus<O>;

export interface Operation<Name extends string, Parameters> {
  name: Name;
  parameters: Parameters;
}

export const createStatusSelectors = <S extends {}>(
  selectStatusHistory: (state: S) => Array<OperationStatus<any>>
) => ({
  getIsInProgress: () => (state: S) => {
    const lastStatus = last(selectStatusHistory(state));
    return lastStatus ? lastStatus.status === 'in-progress' : false;
  },
  getHasSucceeded: () => (state: S) => {
    const lastStatus = last(selectStatusHistory(state));
    return lastStatus ? lastStatus.status === 'succeeded' : false;
  },
  getHasFailed: () => (state: S) => {
    const lastStatus = last(selectStatusHistory(state));
    return lastStatus ? lastStatus.status === 'failed' : false;
  },
  getLastFailureMessage: () => (state: S) => {
    const lastStatus = last(selectStatusHistory(state).filter(isFailedStatus));
    return lastStatus ? lastStatus.message : undefined;
  },
});

export type StatusHistoryUpdater<Operations extends Operation<string, any>> = (
  statusHistory: Array<OperationStatus<Operations>>
) => Array<OperationStatus<Operations>>;

export const createStatusActions = <S extends {}, Operations extends Operation<string, any>>(
  updateStatusHistory: (updater: StatusHistoryUpdater<Operations>) => (state: S) => S
) => ({
  startOperation: (operation: Operations) =>
    updateStatusHistory(statusHistory => [
      ...statusHistory,
      {
        operation,
        status: 'in-progress',
        time: Date.now(),
      },
    ]),
  finishOperation: (operation: Operations) =>
    updateStatusHistory(statusHistory => [
      ...statusHistory,
      {
        operation,
        status: 'succeeded',
        time: Date.now(),
      },
    ]),
  failOperation: (operation: Operations, message: string) =>
    updateStatusHistory(statusHistory => [
      ...statusHistory,
      {
        message,
        operation,
        status: 'failed',
        time: Date.now(),
      },
    ]),
});
