/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { HostsContainer } from './pages';
import { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { HOSTS_PATH } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';

export const HostsRoutes = () => {
  const { executionContext } = useKibana().services;

  // Application ID and current URL are traced automatically.
  useExecutionContext(executionContext, {
    page: SecurityPageName.hosts,
    type: 'application',
  });

  return (
    <TrackApplicationView viewId={SecurityPageName.hosts}>
      <HostsContainer />
    </TrackApplicationView>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: HOSTS_PATH,
    render: HostsRoutes,
  },
];
