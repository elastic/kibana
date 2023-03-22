/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public';
import { LazyDashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { inputsSelectors } from '../../common/store';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useRefetch } from '../hooks/use_refetch';

const DashboardRendererComponent = ({
  canReadDashboard,
  from,
  id,
  inputId = InputsModelId.global,
  onDashboardContainerLoaded,
  savedObjectId,
  to,
}: {
  canReadDashboard: boolean;
  from: string;
  id: string;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  onDashboardContainerLoaded?: (dashboardContainer: DashboardContainer) => void;
  savedObjectId: string | undefined;
  to: string;
}) => {
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();

  const getCreationOptions = useCallback(
    () =>
      Promise.resolve({
        overrideInput: { timeRange: { from, to }, viewMode: ViewMode.VIEW, query, filters },
      }),
    [filters, from, query, to]
  );
  useRefetch({
    inputId,
    id,
    container: dashboardContainer,
  });

  const handleDashboardLoaded = useCallback(
    (container: DashboardContainer) => {
      setDashboardContainer(container);
      onDashboardContainerLoaded?.(container);
    },
    [onDashboardContainerLoaded]
  );
  return savedObjectId && from && to && canReadDashboard ? (
    <LazyDashboardContainerRenderer
      savedObjectId={savedObjectId}
      getCreationOptions={getCreationOptions}
      onDashboardContainerLoaded={handleDashboardLoaded}
    />
  ) : null;
};
DashboardRendererComponent.displayName = 'DashboardRendererComponent';
export const DashboardRenderer = React.memo(DashboardRendererComponent);
