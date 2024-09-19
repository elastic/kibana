/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import {
  isCreationSuccessful,
  getFormEntryStateMutable,
  getActionError,
  getCurrentLocation,
} from '../store/selector';

import { useToasts } from '../../../../common/lib/kibana';
import {
  getCreationSuccessMessage,
  getUpdateSuccessMessage,
  getCreationErrorMessage,
  getUpdateErrorMessage,
  getGetErrorMessage,
} from './translations';

import { State } from '../../../../common/store';
import { EventFiltersListPageState, EventFiltersPageLocation } from '../types';
import { getEventFiltersListPath } from '../../../common/routing';

import {
  MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE as EVENT_FILTER_NS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE as GLOBAL_NS,
} from '../../../common/constants';

export function useEventFiltersSelector<R>(selector: (state: EventFiltersListPageState) => R): R {
  return useSelector((state: State) =>
    selector(state[GLOBAL_NS][EVENT_FILTER_NS] as EventFiltersListPageState)
  );
}

export const useEventFiltersNotification = () => {
  const creationSuccessful = useEventFiltersSelector(isCreationSuccessful);
  const actionError = useEventFiltersSelector(getActionError);
  const formEntry = useEventFiltersSelector(getFormEntryStateMutable);
  const toasts = useToasts();
  const [wasAlreadyHandled] = useState(new WeakSet());

  if (creationSuccessful && formEntry && !wasAlreadyHandled.has(formEntry)) {
    wasAlreadyHandled.add(formEntry);
    if (formEntry.item_id) {
      toasts.addSuccess(getUpdateSuccessMessage(formEntry));
    } else {
      toasts.addSuccess(getCreationSuccessMessage(formEntry));
    }
  } else if (actionError && !wasAlreadyHandled.has(actionError)) {
    wasAlreadyHandled.add(actionError);
    if (formEntry && formEntry.item_id) {
      toasts.addDanger(getUpdateErrorMessage(actionError));
    } else if (formEntry) {
      toasts.addDanger(getCreationErrorMessage(actionError));
    } else {
      toasts.addWarning(getGetErrorMessage(actionError));
    }
  }
};

export function useEventFiltersNavigateCallback() {
  const location = useEventFiltersSelector(getCurrentLocation);
  const history = useHistory();

  return useCallback(
    (args: Partial<EventFiltersPageLocation>) =>
      history.push(getEventFiltersListPath({ ...location, ...args })),
    [history, location]
  );
}
