/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';

import { State } from '../../../../common/store';
import { EventFilterListPageState } from '../state';

import {
  MANAGEMENT_STORE_EVENT_FILTER_NAMESPACE as EVENT_FILTER_NS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE as GLOBAL_NS,
} from '../../../common/constants';

export function useEventFilterSelector<R>(selector: (state: EventFilterListPageState) => R): R {
  return useSelector((state: State) =>
    selector(state[GLOBAL_NS][EVENT_FILTER_NS] as EventFilterListPageState)
  );
}
