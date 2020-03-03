/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { GlobalState, ManagementListState } from '../../types';

export function useManagementListSelector<TSelected>(
  selector: (state: ManagementListState) => TSelected
) {
  return useSelector(function(state: GlobalState) {
    return selector(state.managementList);
  });
}
