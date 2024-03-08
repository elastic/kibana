/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core-http-browser';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DataPublicPluginStart, NowProvider, QueryService } from '@kbn/data-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createPropertyGetProxy } from '../utils/proxies';

/**
 * Create proxy for the data service, in which session service enablement calls
 * are no-ops.
 */
export const createDataServiceProxy = ({
  data,
  http,
  uiSettings,
}: {
  data: DataPublicPluginStart;
  http: HttpStart;
  uiSettings: IUiSettingsClient;
}) => {
  /**
   * search session
   */
  const noOpEnableStorage = () => {};

  const sessionServiceProxy = createPropertyGetProxy(data.search.session, {
    enableStorage: () => noOpEnableStorage,
  });

  const searchServiceProxy = createPropertyGetProxy(data.search, {
    session: () => sessionServiceProxy,
  });

  /**
   * query
   */
  const customStorage = new Storage(localStorage);
  const customQueryService = new QueryService();
  customQueryService.setup({
    nowProvider: new NowProvider(),
    storage: customStorage,
    uiSettings,
  });
  const customQuery = customQueryService.start({
    http,
    storage: customStorage,
    uiSettings,
  });

  /**
   * combined
   */
  return createPropertyGetProxy(data, {
    query: () => customQuery,
    search: () => searchServiceProxy,
  });
};
