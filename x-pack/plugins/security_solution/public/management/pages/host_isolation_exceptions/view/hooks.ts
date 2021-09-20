/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useSelector } from 'react-redux';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_HOST_ISOLATION_EXCEPTIONS_NAMESPACE,
} from '../../../common/constants';

export function useEventFiltersSelector<R>(
  selector: (state: HostIsolationExceptionsPageState) => R
): R {
  return useSelector((state: State) =>
    selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_HOST_ISOLATION_EXCEPTIONS_NAMESPACE]
    )
  );
}
