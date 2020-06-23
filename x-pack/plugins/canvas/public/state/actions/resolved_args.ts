/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action as ReduxAction } from 'redux';
import { createAction } from 'redux-actions';

export const setLoadingActionType = 'setResolvedLoading';
export const setValueActionType = 'setResolvedValue';
export const inFlightActiveActionType = 'inFlightActive';
export const inFlightCompleteActionType = 'inFlightComplete';

type InFlightActive = ReduxAction<typeof inFlightActiveActionType>;
type InFlightComplete = ReduxAction<typeof inFlightCompleteActionType>;

interface SetResolvedLoadingPayload {
  path: any[];
}
type SetResolvedLoading = ReduxAction<typeof setLoadingActionType> & {
  payload: SetResolvedLoadingPayload;
};

interface SetResolvedValuePayload {
  path: any[];
  value: any;
}
type SetResolvedValue = ReduxAction<typeof setValueActionType> & {
  payload: SetResolvedValuePayload;
};

export type Action = SetResolvedLoading | SetResolvedValue | InFlightActive | InFlightComplete;

export const setLoading = createAction<SetResolvedLoadingPayload>(setLoadingActionType);
export const setValue = createAction<SetResolvedValuePayload>(setValueActionType);
export const setValues = createAction('setResolvedValues');
export const clearValue = createAction('clearResolvedValue');
export const clearValues = createAction('clearResolvedValues');

export const inFlightActive = createAction<undefined>(inFlightActiveActionType, () => undefined);
export const inFlightComplete = createAction<undefined>(
  inFlightCompleteActionType,
  () => undefined
);
