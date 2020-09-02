/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';

import { State } from '../../../../common/store';

import {
  MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE as TRUSTED_APPS_NS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE as GLOBAL_NS,
} from '../../../common/constants';

import { TrustedAppsPageState } from '../state/trusted_apps_page_state';

export function useTrustedAppsSelector<R>(selector: (state: TrustedAppsPageState) => R): R {
  return useSelector((state: State) =>
    selector(state[GLOBAL_NS][TRUSTED_APPS_NS] as TrustedAppsPageState)
  );
}
