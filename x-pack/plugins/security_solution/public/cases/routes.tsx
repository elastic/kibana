/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { CASES_PATH } from '../../common/constants';
import { Case } from './pages';

export const CasesRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.case}>
    <Case />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: CASES_PATH,
    render: CasesRoutes,
  },
];
