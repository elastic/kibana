/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public';
import { LazyDashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { useHistory } from 'react-router-dom';
import { startSyncingDashboardUrlState } from '@kbn/dashboard-plugin/public/dashboard_app/url/sync_dashboard_url_state';
import { inputsSelectors } from '../../common/store';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useRefetch } from '../hooks/use_refetch';
import { useKibana } from '../../common/lib/kibana';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import {
  RESTORE_URL_ERROR_TITLE,
  SAVE_STATE_IN_URL_ERROR_TITLE,
} from '../pages/details/translations';

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
  const {
    services: { uiSettings },
  } = useKibana();
  const toasts = useAppToasts();
  const history = useHistory();
  console.log('history', history);

  const kbnUrlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: uiSettings.get('state:storeInSessionStorage'),
        onGetError: (error: Error) => {
          toasts.addError(error, {
            title: RESTORE_URL_ERROR_TITLE,
          });
        },
        onSetError: (error: Error) => {
          toasts.addError(error, {
            title: SAVE_STATE_IN_URL_ERROR_TITLE,
          });
        },
      }),
    [toasts, history, uiSettings]
  );
  const getCreationOptions = useCallback(
    () =>
      Promise.resolve({
        useUnifiedSearchIntegration: true,
        unifiedSearchSettings: {
          kbnUrlStateStorage,
        },
        overrideInput: { timeRange: { from, to }, viewMode: ViewMode.VIEW, query, filters },
      }),
    [filters, from, kbnUrlStateStorage, query, to]
  );
  useRefetch({
    inputId,
    id,
    container: dashboardContainer,
  });

  /**
   * When the dashboard container is created, or re-created, start syncing dashboard state with the URL
   */
  useEffect(() => {
    if (!dashboardContainer) return;
    const { stopWatchingAppStateInUrl } = startSyncingDashboardUrlState({
      kbnUrlStateStorage,
      dashboardContainer,
    });
    return () => stopWatchingAppStateInUrl();
  }, [dashboardContainer, kbnUrlStateStorage]);

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
