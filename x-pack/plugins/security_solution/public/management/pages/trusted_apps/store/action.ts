/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerApiError } from '../../../../common/types';
import { TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { RoutingAction } from '../../../../common/store/routing/action';
import { AsyncDataBinding } from '../state/async_data_binding';
import { ItemsPage } from '../state/items_page';

export interface ListDataBindingChanged {
  type: 'listDataBindingChanged';
  payload: {
    newBinding: AsyncDataBinding<ItemsPage<TrustedApp>, ServerApiError>;
  };
}

export type TrustedAppsPageAction = ListDataBindingChanged | RoutingAction;
