/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { GlobalState } from './reducer';
import { EndpointListState } from './endpoint_list';

export function useEndpointListSelector<TSelected>(
  selector: (state: EndpointListState) => TSelected
) {
  return useSelector(function(state: GlobalState) {
    return selector(state.endpointList);
  });
}
