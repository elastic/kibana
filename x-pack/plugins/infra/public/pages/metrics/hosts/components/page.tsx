/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useKbnUrlStateStorageFromRouterContext } from '../../../../utils/kbn_url_state_context';
import { useKibanaQuerySettings } from '../../../../utils/use_kibana_query_settings';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetricsDataViewContext } from '../hooks/use_metrics_data_view';

import { HostsViewPageStateProvider } from '../machines/page_state/provider';
import { HostContainer } from './hosts_container';

export const Page = () => {
  const { dataViewStateNotifications } = useMetricsDataViewContext();

  const {
    services: {
      data: {
        query: {
          queryString: queryStringService,
          filterManager: filterManagerService,
          timefilter: { timefilter: timeFilterService },
        },
      },
    },
  } = useKibanaContextForPlugin();
  const kibanaQuerySettings = useKibanaQuerySettings();
  const urlStateStorage = useKbnUrlStateStorageFromRouterContext();

  return (
    <HostsViewPageStateProvider
      dataViewStateNotifications={dataViewStateNotifications}
      filterManagerService={filterManagerService}
      queryStringService={queryStringService}
      timeFilterService={timeFilterService}
      kibanaQuerySettings={kibanaQuerySettings}
      urlStateStorage={urlStateStorage}
    >
      <HostContainer />
    </HostsViewPageStateProvider>
  );
};
