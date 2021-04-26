/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useSelector } from 'react-redux';

import { isCreationSuccessful, getFormEntry, getCreationError } from '../store/selector';

import { useToasts } from '../../../../common/lib/kibana';
import { getCreationSuccessMessage, getCreationErrorMessage } from './translations';

import { State } from '../../../../common/store';
import { EventFiltersListPageState } from '../state';

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
  const creationError = useEventFiltersSelector(getCreationError);
  const formEntry = useEventFiltersSelector(getFormEntry);
  const toasts = useToasts();
  const [wasAlreadyHandled] = useState(new WeakSet());

  if (creationSuccessful && formEntry && !wasAlreadyHandled.has(formEntry)) {
    wasAlreadyHandled.add(formEntry);
    toasts.addSuccess(getCreationSuccessMessage(formEntry));
  } else if (creationError && !wasAlreadyHandled.has(creationError)) {
    wasAlreadyHandled.add(creationError);
    toasts.addDanger(getCreationErrorMessage(creationError));
  }
};
