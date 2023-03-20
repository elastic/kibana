/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { LazyDashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { useParams } from 'react-router-dom';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useGlobalTime } from '../../common/containers/use_global_time';

const DashboardViewComponent: React.FC = () => {
  const { detailName } = useParams<{ detailName?: string }>();
  const timeRange = useGlobalTime();
  const getCreationOptions = useCallback(
    () => Promise.resolve({ overrideInput: { timeRange } }),
    [timeRange]
  );
  return (
    <>
      {detailName && timeRange && (
        <LazyDashboardContainerRenderer
          savedObjectId={detailName}
          getCreationOptions={getCreationOptions}
        />
      )}
      <SpyRoute pageName={SecurityPageName.dashboardView} />
    </>
  );
};
DashboardViewComponent.displayName = 'DashboardViewComponent';
export const DashboardView = React.memo(DashboardViewComponent);
