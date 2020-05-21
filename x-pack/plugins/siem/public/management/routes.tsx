/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { SiemPageName } from '../app/types';
import { PageView } from '../common/components/endpoint/page_view';
import { SpyRoute } from '../common/utils/route/spy_routes';

export const getManagementRoutes = () => [
  <Route
    path={`/:pageName(${SiemPageName.management})`}
    render={() => {
      return (
        <PageView viewType="list" headerLeft="Test">
          {'Its a test!'}
          <SpyRoute />
        </PageView>
      );
    }}
  />,
];
