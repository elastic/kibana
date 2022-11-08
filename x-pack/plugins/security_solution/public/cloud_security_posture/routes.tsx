/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { CloudSecurityPosturePageId } from '@kbn/cloud-security-posture-plugin/public';
import {
  CLOUD_SECURITY_POSTURE_BASE_PATH,
  type CspSecuritySolutionContext,
} from '@kbn/cloud-security-posture-plugin/public';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { useIsGroupedNavigationEnabled } from '../common/components/navigation/helpers';
import { MANAGE_PATH } from '../../common/constants';
import type { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { useKibana } from '../common/lib/kibana';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { FiltersGlobal } from '../common/components/filters_global';
import { MANAGE } from '../app/translations';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

// This exists only for the type signature cast
const CloudPostureSpyRoute = ({ pageName }: { pageName?: CloudSecurityPosturePageId }) => (
  <SpyRoute pageName={pageName as SecurityPageName | undefined} />
);

const CloudSecurityPosture = memo(() => {
  const { cloudSecurityPosture } = useKibana().services;
  const isGroupedNavigationEnabled = useIsGroupedNavigationEnabled();
  const CloudSecurityPostureRouter = cloudSecurityPosture.getCloudSecurityPostureRouter();
  const securitySolutionContext: CspSecuritySolutionContext = {
    getFiltersGlobalComponent: () => FiltersGlobal,
    getSpyRouteComponent: () => CloudPostureSpyRoute,
    getManageBreadcrumbEntry: () =>
      isGroupedNavigationEnabled ? { name: MANAGE, path: MANAGE_PATH } : undefined,
  };

  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId="cloud_security_posture">
        <SecuritySolutionPageWrapper noPadding noTimeline>
          <CloudSecurityPostureRouter securitySolutionContext={securitySolutionContext} />
        </SecuritySolutionPageWrapper>
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
});

CloudSecurityPosture.displayName = 'CloudSecurityPosture';

export const routes: SecuritySubPluginRoutes = [
  {
    path: CLOUD_SECURITY_POSTURE_BASE_PATH,
    render: () => <CloudSecurityPosture />,
  },
];
