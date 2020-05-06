/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { Immutable } from '../../../../../../common/types';
import { GlobalState } from '../../../types';
import { AlertingState } from '../../../../../../common/alerting/types';

export function useAlertListSelector<TSelected>(
  selector: (
    state: Immutable<AlertingState>
  ) => TSelected extends Immutable<TSelected> ? TSelected : never
) {
  return useSelector((state: Immutable<GlobalState>) => selector(state.alerting));
}
