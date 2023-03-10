/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { LazyDashboardContainerRenderer } from '@kbn/dashboard-plugin/public';

const DashboardRendererComponent = ({
  from,
  to,
  canReadDashboard,
}: {
  from: string;
  to: string;
  canReadDashboard: boolean;
}) => {
  const { detailName } = useParams<{ detailName?: string }>();
  const getCreationOptions = useCallback(
    () => Promise.resolve({ overrideInput: { timeRange: { from, to } } }),
    [from, to]
  );
  return detailName && from && to && canReadDashboard ? (
    <LazyDashboardContainerRenderer
      savedObjectId={detailName}
      getCreationOptions={getCreationOptions}
    />
  ) : null;
};
DashboardRendererComponent.displayName = 'DashboardRendererComponent';
export const DashboardRenderer = React.memo(DashboardRendererComponent);
