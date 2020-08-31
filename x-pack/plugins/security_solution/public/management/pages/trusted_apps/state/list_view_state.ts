/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerApiError } from '../../../../common/types';
import { ItemsPage, PageInfo } from './items_page';
import { AsyncDataBinding } from './async_data_binding';

export interface ListViewState<T> {
  currentPage: AsyncDataBinding<ItemsPage<T>, ServerApiError>;
  currentPageInfo: PageInfo;
}
