/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { useContext, useMemo } from 'react';
import { Immutable } from '../../../../../common/types';
import { PolicyListState, PolicyDetailsState } from '../../types';
import { policyListSelectorContext } from '../../policy_list';
import { policyDetailsSelectorContext } from '../../policy_details';

export function usePolicyListSelector<TSelected>(
  selector: (
    state: Immutable<PolicyListState>
  ) => TSelected extends Immutable<TSelected> ? TSelected : never
) {
  const substate = useContext(policyListSelectorContext);
  const globalState = useSelector((state: PolicyListState) => state);
  return useMemo(() => {
    if (substate === undefined) {
      return selector(globalState);
    }
    return selector(substate);
  }, [substate, globalState, selector]);
}

export function usePolicyDetailsSelector<TSelected>(
  selector: (
    state: Immutable<PolicyDetailsState>
  ) => TSelected extends Immutable<TSelected> ? TSelected : never
) {
  const substate = useContext(policyDetailsSelectorContext);
  const globalState = useSelector((state: PolicyDetailsState) => state);
  return useMemo(() => {
    if (substate === undefined) {
      return selector(globalState);
    }
    return selector(substate);
  }, [substate, globalState, selector]);
}
