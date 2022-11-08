/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../common/components/guided_onboarding_tour/tour_config';
import type { SecuritySubPluginRoutes } from '../app/types';
import { CASES_PATH } from '../../common/constants';
import { Cases } from './pages';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { useTourContext } from '../common/components/guided_onboarding_tour';

export const CasesRoutes = () => {
  const { activeStep, endTourStep, isTourShown } = useTourContext();

  const isTourActive = useMemo(
    () => activeStep === AlertsCasesTourSteps.viewCase && isTourShown(SecurityStepId.alertsCases),
    [activeStep, isTourShown]
  );

  useEffect(() => {
    if (isTourActive) endTourStep(SecurityStepId.alertsCases);
  }, [endTourStep, isTourActive]);

  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId="case">
        <Cases />
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: CASES_PATH,
    component: CasesRoutes,
  },
];
