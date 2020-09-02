/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { ServerApiError } from '../../../../common/types';
import { AsyncDataBinding } from './async_data_binding';

export interface PageInfo {
  index: number;
  size: number;
}

export interface TrustedAppsItemsPage {
  items: TrustedApp[];
  pageInfo: PageInfo;
  totalItemsCount: number;
}

export interface TrustedAppsPageState {
  list: {
    currentPage: AsyncDataBinding<TrustedAppsItemsPage, ServerApiError>;
    currentPageInfo: PageInfo;
  };
  active: boolean;
}
