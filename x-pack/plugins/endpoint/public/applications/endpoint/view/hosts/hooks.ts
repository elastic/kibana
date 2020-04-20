/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { GlobalState, HostState } from '../../types';

export function useHostSelector<TSelected>(selector: (state: HostState) => TSelected) {
  return useSelector(function(state: GlobalState) {
    return selector(state.hostList);
  });
}
