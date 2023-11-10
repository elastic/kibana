/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { createPropertyGetProxy } from '../utils/proxies';

/**
 * Create proxy for the data service, in which session service enablement calls
 * are no-ops.
 */
export const createDataServiceProxy = (data: DataPublicPluginStart) => {
  const noOpEnableStorage = () => {};

  const sessionServiceProxy = createPropertyGetProxy(data.search.session, {
    enableStorage: () => noOpEnableStorage,
  });

  const searchServiceProxy = createPropertyGetProxy(data.search, {
    session: () => sessionServiceProxy,
  });

  return createPropertyGetProxy(data, {
    search: () => searchServiceProxy,
  });
};
