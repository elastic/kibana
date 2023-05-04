/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import type { EndpointState } from '../../types';
import type { State } from '../../../../../common/store';
import {
  MANAGEMENT_STORE_ENDPOINTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
} from '../../../../common/constants';

export function useEndpointSelector<TSelected>(selector: (state: EndpointState) => TSelected) {
  return useSelector(function (state: State) {
    return selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][
        MANAGEMENT_STORE_ENDPOINTS_NAMESPACE
      ] as EndpointState
    );
  });
}
