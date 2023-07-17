/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { Redirect } from 'react-router-dom';
import { SecurityPageName } from '../../../common/constants';

import { PluginTemplateWrapper } from '../../common/components/plugin_template_wrapper';
import { CoverageOverviewPage } from '../../detection_engine/rule_management_ui/pages/coverage_overview';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

const CoverageOverviewRoutes = () => {
  const isDetectionsCoverageOverviewEnabled = useIsExperimentalFeatureEnabled(
    'detectionsCoverageOverview'
  );

  return isDetectionsCoverageOverviewEnabled ? (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId={SecurityPageName.coverageOverview}>
        <CoverageOverviewPage />
      </TrackApplicationView>
    </PluginTemplateWrapper>
  ) : (
    <Redirect to={SecurityPageName.landing} />
  );
};

CoverageOverviewRoutes.displayName = 'CoverageOverviewRoutes';

// eslint-disable-next-line import/no-default-export
export default CoverageOverviewRoutes;
