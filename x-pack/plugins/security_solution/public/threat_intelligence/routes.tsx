/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { ThreatIntelligencePage } from './pages/threat_intelligence';
import { SecurityPageName, THREAT_INTELLIGENCE_PATH } from '../../common/constants';
import { SecuritySubPluginRoutes } from '../app/types';

const ThreatIntelligenceRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.threatIntelligence}>
    <ThreatIntelligencePage />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: THREAT_INTELLIGENCE_PATH,
    render: ThreatIntelligenceRoutes,
  },
];
