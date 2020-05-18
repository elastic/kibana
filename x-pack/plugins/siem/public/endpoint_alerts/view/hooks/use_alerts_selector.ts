/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { Immutable, AlertListState } from '../../../../common/endpoint_alerts/types';
import { State } from '../../../common/store/reducer';

export function useAlertListSelector<TSelected>(
  selector: (
    state: Immutable<AlertListState>
  ) => TSelected extends Immutable<TSelected> ? TSelected : never
) {
  return useSelector((state: Immutable<State>) => selector(state.alertList));
}
