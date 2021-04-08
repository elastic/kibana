/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';

import { State } from '../../../../common/store';
import { EventFiltersListPageState } from '../state';

import {
  MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE as EVENT_FILTERS_NS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE as GLOBAL_NS,
} from '../../../common/constants';

export function useEventFiltersSelector<R>(selector: (state: EventFiltersListPageState) => R): R {
  return useSelector((state: State) =>
    selector(state[GLOBAL_NS][EVENT_FILTERS_NS] as EventFiltersListPageState)
  );
}
