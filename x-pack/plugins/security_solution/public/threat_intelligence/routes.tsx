/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { ThreatIntelligencePage } from './pages/threat_intelligence';
import { SecurityPageName, THREAT_INTELLIGENCE_PATH } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';

const ThreatIntelligenceRoutes = () => {
  const enabled = useIsExperimentalFeatureEnabled('threatIntelligenceEnabled');
  if (!enabled) {
    return <Redirect to="/" />;
  }

  return (
    <TrackApplicationView viewId={SecurityPageName.threatIntelligence}>
      <ThreatIntelligencePage />
    </TrackApplicationView>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: THREAT_INTELLIGENCE_PATH,
    component: ThreatIntelligenceRoutes,
  },
];
