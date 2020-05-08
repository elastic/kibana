/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { useContext, useMemo } from 'react';
import { Immutable } from '../../../../../../common/types';
import { AlertingState } from '../../../../../../common/alerting/types';
import { alertingSelectorContext } from '../..';

export function useAlertingSelector<TSelected>(
  selector: (
    state: Immutable<AlertingState>
  ) => TSelected extends Immutable<TSelected> ? TSelected : never
) {
  const alertingState = useContext(alertingSelectorContext);
  const globalState = useSelector((state: AlertingState) => state);
  return useMemo(() => {
    if (alertingState === undefined) {
      return selector(globalState);
    }
    return selector(alertingState);
  }, [alertingState, globalState, selector]);
}
