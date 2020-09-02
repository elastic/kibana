/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerApiError } from '../../../../common/types';
import { RoutingAction } from '../../../../common/store/routing/action';
import { AsyncDataBinding } from '../state/async_data_binding';
import { TrustedAppsListData } from '../state/trusted_apps_list_page_state';

export interface ListDataBindingChanged {
  type: 'listDataBindingChanged';
  payload: {
    newBinding: AsyncDataBinding<TrustedAppsListData, ServerApiError>;
  };
}

export type TrustedAppsPageAction = ListDataBindingChanged | RoutingAction;
