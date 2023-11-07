/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraBackendLibs } from '../../lib/infra_types';
import { initCreateInventoryViewRoute } from './create_inventory_view';
import { initDeleteInventoryViewRoute } from './delete_inventory_view';
import { initFindInventoryViewRoute } from './find_inventory_view';
import { initGetInventoryViewRoute } from './get_inventory_view';
import { initUpdateInventoryViewRoute } from './update_inventory_view';

export const initInventoryViewRoutes = (
  dependencies: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>
) => {
  initCreateInventoryViewRoute(dependencies);
  initDeleteInventoryViewRoute(dependencies);
  initFindInventoryViewRoute(dependencies);
  initGetInventoryViewRoute(dependencies);
  initUpdateInventoryViewRoute(dependencies);
};
