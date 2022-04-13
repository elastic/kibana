/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MANAGEMENT_PATH } from '../../common/constants';
import { ManagementContainer } from './pages';
import { SecuritySubPluginRoutes } from '../app/types';
import { CurrentLicense } from '../common/components/current_license';
import { useExecutionContext } from '../../../../../src/plugins/kibana_react/public';
import { useKibana } from '../common/lib/kibana';

/**
 * Returns the React Router Routes for the management area
 */
const ManagementRoutes = () => {
  const { executionContext } = useKibana().services;

  // Application ID and current URL are traced automatically.
  useExecutionContext(executionContext, {
    page: 'Manage',
    type: 'application'
  });

  return (
    <CurrentLicense>
      <ManagementContainer />
    </CurrentLicense>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: MANAGEMENT_PATH,
    render: ManagementRoutes,
  },
];
