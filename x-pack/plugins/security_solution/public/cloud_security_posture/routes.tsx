/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import {
  CLOUD_SECURITY_POSTURE_BENCHMARKS_PATH,
  CLOUD_SECURITY_POSTURE_DASHBOARD_PATH,
  CLOUD_SECURITY_POSTURE_FINDINGS_PATH,
  CLOUD_SECURITY_POSTURE_PATH,
  SecurityPageName,
} from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';

const CloudSecurityPosture = ({ pageName }: { pageName: SecurityPageName }) => {
  return (
    <TrackApplicationView viewId={pageName}>
      <SecuritySolutionPageWrapper noPadding noTimeline>
        <SpyRoute pageName={pageName} />
        <EuiTitle>
          <h1>{'Coming soon'}</h1>
        </EuiTitle>
      </SecuritySolutionPageWrapper>
    </TrackApplicationView>
  );
};

// TODO: We'll probably use a single route here, and we'll manage all CSP pages in an internal router in the CSP plugin.
//  For now we have multiple routes as we need `SpyRoute` to use a specific `pageName` for highlighting the correct
//  navigation bar entry
export const routes: SecuritySubPluginRoutes = [
  {
    path: CLOUD_SECURITY_POSTURE_PATH,
    render: () => <CloudSecurityPosture pageName={SecurityPageName.cloudSecurityPosture} />,
    exact: true,
  },
  {
    path: CLOUD_SECURITY_POSTURE_FINDINGS_PATH,
    render: () => <CloudSecurityPosture pageName={SecurityPageName.cloudSecurityPostureFindings} />,
  },
  {
    path: CLOUD_SECURITY_POSTURE_DASHBOARD_PATH,
    render: () => (
      <CloudSecurityPosture pageName={SecurityPageName.cloudSecurityPostureDashboard} />
    ),
  },
  {
    path: CLOUD_SECURITY_POSTURE_BENCHMARKS_PATH,
    render: () => (
      <CloudSecurityPosture pageName={SecurityPageName.cloudSecurityPostureBenchmarks} />
    ),
  },
];
