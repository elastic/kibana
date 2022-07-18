/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { CloudSecurityPosturePageId } from '@kbn/cloud-security-posture-plugin/public';
import {
  CLOUD_SECURITY_POSTURE_BASE_PATH,
  type CspSecuritySolutionContext,
} from '@kbn/cloud-security-posture-plugin/public';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { useKibana } from '../common/lib/kibana';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { FiltersGlobal } from '../common/components/filters_global';

// This exists only for the type signature cast
const CloudPostureSpyRoute = ({ pageName }: { pageName?: CloudSecurityPosturePageId }) => (
  <SpyRoute pageName={pageName as SecurityPageName | undefined} />
);

const CloudSecurityPosture = () => {
  const { cloudSecurityPosture } = useKibana().services;
  const CloudSecurityPostureRouter = cloudSecurityPosture.getCloudSecurityPostureRouter();
  const securitySolutionContext: CspSecuritySolutionContext = {
    getFiltersGlobalComponent: () => FiltersGlobal,
    getSpyRouteComponent: () => CloudPostureSpyRoute,
  };

  return (
    // TODO: Finer granularity of this needs to be implemented in the cloud security posture plugin
    <TrackApplicationView viewId="cloud_security_posture">
      <SecuritySolutionPageWrapper noPadding noTimeline>
        <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
          <CloudSecurityPostureRouter securitySolutionContext={securitySolutionContext} />
        </Suspense>
      </SecuritySolutionPageWrapper>
    </TrackApplicationView>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: CLOUD_SECURITY_POSTURE_BASE_PATH,
    render: () => <CloudSecurityPosture />,
  },
];
