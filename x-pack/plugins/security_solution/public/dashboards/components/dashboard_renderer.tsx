/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public';
import { LazyDashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query } from '@kbn/es-query';

import { InputsModelId } from '../../common/store/inputs/constants';
import { useRefetch } from '../hooks/use_refetch';

const DashboardRendererComponent = ({
  canReadDashboard,
  filters,
  id,
  inputId = InputsModelId.global,
  onDashboardContainerLoaded,
  query,
  savedObjectId,
  timeRange,
}: {
  canReadDashboard: boolean;
  filters?: Filter[];
  id: string;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  onDashboardContainerLoaded?: (dashboardContainer: DashboardContainer) => void;
  query?: Query;
  savedObjectId: string | undefined;
  timeRange: {
    from: string;
    fromStr?: string | undefined;
    to: string;
    toStr?: string | undefined;
  };
}) => {
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();

  const getCreationOptions = useCallback(
    () =>
      Promise.resolve({
        overrideInput: { timeRange, viewMode: ViewMode.VIEW, query, filters },
      }),
    [filters, query, timeRange]
  );
  useRefetch({
    inputId,
    id,
    container: dashboardContainer,
  });

  useEffect(() => {
    dashboardContainer?.updateInput({ timeRange, query, filters });
  }, [dashboardContainer, filters, query, timeRange]);

  const handleDashboardLoaded = useCallback(
    (container: DashboardContainer) => {
      setDashboardContainer(container);
      onDashboardContainerLoaded?.(container);
    },
    [onDashboardContainerLoaded]
  );
  return savedObjectId && canReadDashboard ? (
    <LazyDashboardContainerRenderer
      savedObjectId={savedObjectId}
      getCreationOptions={getCreationOptions}
      onDashboardContainerLoaded={handleDashboardLoaded}
    />
  ) : null;
};
DashboardRendererComponent.displayName = 'DashboardRendererComponent';
export const DashboardRenderer = React.memo(DashboardRendererComponent);
