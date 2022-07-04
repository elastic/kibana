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
import { CLOUD_SECURITY_POSTURE_PATH, SecurityPageName } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';

const CloudSecurityPosture = () => {
  return (
    <TrackApplicationView viewId={SecurityPageName.cloudSecurityPosture}>
      <SecuritySolutionPageWrapper noPadding noTimeline>
        <SpyRoute pageName={SecurityPageName.cloudSecurityPosture} />
        <EuiTitle>
          <h1>{'Coming soon'}</h1>
        </EuiTitle>
      </SecuritySolutionPageWrapper>
    </TrackApplicationView>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: CLOUD_SECURITY_POSTURE_PATH,
    render: () => <CloudSecurityPosture />,
  },
];
