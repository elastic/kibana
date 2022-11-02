/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteProps } from 'react-router-dom';
import { AssetInventoryListPage } from '../pages/asset_inventory_list_page';

export const routes: RouteProps[] = [
  {
    path: '/',
    component: AssetInventoryListPage,
  },
];
