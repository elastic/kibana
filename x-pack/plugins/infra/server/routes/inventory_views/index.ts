/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import { InfraPluginStartServicesAccessor } from '../../types';
import { initDeleteInventoryViewRoute } from './delete_inventory_view';
import { initFindInventoryViewRoute } from './find_inventory_view';
import { initGetInventoryViewRoute } from './get_inventory_view';
import { initPutInventoryViewRoute } from './put_inventory_view';

export const initInventoryViewRoutes = (dependencies: {
  framework: KibanaFramework;
  getStartServices: InfraPluginStartServicesAccessor;
}) => {
  initDeleteInventoryViewRoute(dependencies);
  initFindInventoryViewRoute(dependencies);
  initGetInventoryViewRoute(dependencies);
  initPutInventoryViewRoute(dependencies);
};
