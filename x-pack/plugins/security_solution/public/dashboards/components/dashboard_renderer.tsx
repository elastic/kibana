/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { DashboardAPI, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer as DashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query } from '@kbn/es-query';

import { useDispatch } from 'react-redux';
import { InputsModelId } from '../../common/store/inputs/constants';
import { inputsActions } from '../../common/store/inputs';
import { useKibana } from '../../common/lib/kibana';
import { APP_UI_ID } from '../../../common';
import { useSecurityTags } from '../context/dashboard_context';
import { DASHBOARDS_PATH } from '../../../common/constants';

const DashboardRendererComponent = ({
  canReadDashboard,
  dashboardContainer,
  filters,
  id,
  inputId = InputsModelId.global,
  onDashboardContainerLoaded,
  query,
  savedObjectId,
  timeRange,
  viewMode = ViewMode.VIEW,
}: {
  canReadDashboard: boolean;
  dashboardContainer?: DashboardAPI;
  filters?: Filter[];
  id: string;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  onDashboardContainerLoaded?: (dashboardContainer: DashboardAPI) => void;
  query?: Query;
  savedObjectId: string | undefined;
  timeRange: {
    from: string;
    fromStr?: string | undefined;
    to: string;
    toStr?: string | undefined;
  };
  viewMode?: ViewMode;
}) => {
  const { embeddable } = useKibana().services;
  const dispatch = useDispatch();

  const securityTags = useSecurityTags();
  const firstSecurityTagId = securityTags?.[0]?.id;

  const isCreateDashboard = !savedObjectId;

  const getCreationOptions: () => Promise<DashboardCreationOptions> = useCallback(
    () =>
      Promise.resolve({
        useSessionStorageIntegration: true,
        useControlGroupIntegration: true,
        getInitialInput: () => ({
          timeRange,
          viewMode,
          query,
          filters,
        }),
        getIncomingEmbeddable: () =>
          embeddable.getStateTransfer().getIncomingEmbeddablePackage(APP_UI_ID, true),
        getEmbeddableAppContext: (dashboardId?: string) => ({
          getCurrentPath: () =>
            dashboardId ? `${DASHBOARDS_PATH}/${dashboardId}/edit` : `${DASHBOARDS_PATH}/create`,
          currentAppId: APP_UI_ID,
        }),
      }),
    [embeddable, filters, query, timeRange, viewMode]
  );

  const refetchByForceRefresh = useCallback(() => {
    dashboardContainer?.forceRefresh();
  }, [dashboardContainer]);

  useEffect(() => {
    dispatch(
      inputsActions.setQuery({
        inputId,
        id,
        refetch: refetchByForceRefresh,
        loading: false,
        inspect: null,
      })
    );
    return () => {
      dispatch(inputsActions.deleteOneQuery({ inputId, id }));
    };
  }, [dispatch, id, inputId, refetchByForceRefresh]);

  useEffect(() => {
    dashboardContainer?.updateInput({ timeRange, query, filters });
  }, [dashboardContainer, filters, query, timeRange]);

  useEffect(() => {
    if (isCreateDashboard && firstSecurityTagId)
      dashboardContainer?.updateInput({ tags: [firstSecurityTagId] });
  }, [dashboardContainer, firstSecurityTagId, isCreateDashboard]);

  /** Dashboard renderer is stored in the state as it's a temporary solution for
   *  https://github.com/elastic/kibana/issues/167751
   **/
  const [dashboardContainerRenderer, setDashboardContainerRenderer] = useState<
    React.ReactElement | undefined
  >(undefined);

  useEffect(() => {
    setDashboardContainerRenderer(
      <DashboardContainerRenderer
        ref={onDashboardContainerLoaded}
        savedObjectId={savedObjectId}
        getCreationOptions={getCreationOptions}
      />
    );

    return () => {
      setDashboardContainerRenderer(undefined);
    };
  }, [getCreationOptions, onDashboardContainerLoaded, refetchByForceRefresh, savedObjectId]);

  return canReadDashboard ? <>{dashboardContainerRenderer}</> : null;
};
DashboardRendererComponent.displayName = 'DashboardRendererComponent';
export const DashboardRenderer = React.memo(DashboardRendererComponent);
