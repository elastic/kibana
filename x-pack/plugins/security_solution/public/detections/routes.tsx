/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { ALERTS_PATH, SecurityPageName } from '../../common/constants';

import { SpyRoute } from '../common/utils/route/spy_routes';

import { DetectionEnginePage } from './pages/detection_engine/detection_engine';

export const AlertsRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <DetectionEnginePage />
    <SpyRoute pageName={SecurityPageName.alerts} />
  </TrackApplicationView>
);

export const routes = [
  {
    path: ALERTS_PATH,
    render: AlertsRoutes,
  },
];
