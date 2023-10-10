/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { DashboardContainerInput } from '@kbn/dashboard-plugin/common';
import type { DashboardAPI, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer as DashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query } from '@kbn/es-query';

import { useDispatch } from 'react-redux';
import { BehaviorSubject } from 'rxjs';
import { APP_UI_ID } from '../../../common';
import { DASHBOARDS_PATH, SecurityPageName } from '../../../common/constants';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useKibana, useNavigateTo } from '../../common/lib/kibana';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../common/lib/telemetry';
import { inputsActions } from '../../common/store/inputs';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useSecurityTags } from '../context/dashboard_context';

const initialInput = new BehaviorSubject<Partial<DashboardContainerInput>>({});

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
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const firstSecurityTagId = securityTags?.[0]?.id;

  const isCreateDashboard = !savedObjectId;

  const getSecuritySolutionDashboardUrl = useCallback(
    ({ dashboardId }) => {
      return getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: dashboardId,
      });
    },
    [getSecuritySolutionUrl]
  );

  const goToDashboard = useCallback(
    async (params) => {
      track(METRIC_TYPE.CLICK, TELEMETRY_EVENT.DASHBOARD);
      navigateTo({
        url: getSecuritySolutionDashboardUrl(params),
      });
      dashboardContainer?.updateInput({ timeRange, query, filters });
    },
    [getSecuritySolutionDashboardUrl, navigateTo, dashboardContainer, timeRange, query, filters]
  );

  const locator = useMemo(() => {
    return {
      navigate: goToDashboard,
      getRedirectUrl: getSecuritySolutionDashboardUrl,
    };
  }, [goToDashboard, getSecuritySolutionDashboardUrl]);

  useEffect(() => {
    initialInput.next({ timeRange, viewMode, query, filters });
  }, [timeRange, viewMode, query, filters]);

  const getCreationOptions: () => Promise<DashboardCreationOptions> = useCallback(() => {
    return Promise.resolve({
      useSessionStorageIntegration: true,
      useControlGroupIntegration: true,
      getInitialInput: () => {
        return initialInput.value;
      },
      getIncomingEmbeddable: () =>
        embeddable.getStateTransfer().getIncomingEmbeddablePackage(APP_UI_ID, true),
      getEmbeddableAppContext: (dashboardId?: string) => ({
        getCurrentPath: () =>
          dashboardId ? `${DASHBOARDS_PATH}/${dashboardId}/edit` : `${DASHBOARDS_PATH}/create`,
        currentAppId: APP_UI_ID,
      }),
    });
  }, [embeddable]);

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
    console.log('UPDATE INPUT', { timeRange, query, filters });
    dashboardContainer?.updateInput({ timeRange, query, filters });
  }, [dashboardContainer, filters, query, timeRange]);

  useEffect(() => {
    if (isCreateDashboard && firstSecurityTagId)
      dashboardContainer?.updateInput({ tags: [firstSecurityTagId] });
  }, [dashboardContainer, firstSecurityTagId, isCreateDashboard]);

  useEffect(() => {
    console.log('dashboardContainer', dashboardContainer);
  }, [dashboardContainer]);

  /** Dashboard renderer is stored in the state as it's a temporary solution for
   *  https://github.com/elastic/kibana/issues/167751
   **/
  const [dashboardContainerRenderer, setDashboardContainerRenderer] = useState<
    React.ReactElement | undefined
  >(undefined);

  useEffect(() => {
    setDashboardContainerRenderer(
      <DashboardContainerRenderer
        locator={locator}
        ref={onDashboardContainerLoaded}
        savedObjectId={savedObjectId}
        getCreationOptions={getCreationOptions}
      />
    );

    return () => {
      setDashboardContainerRenderer(undefined);
    };
  }, [
    getCreationOptions,
    onDashboardContainerLoaded,
    refetchByForceRefresh,
    savedObjectId,
    locator,
  ]);

  return canReadDashboard ? <>{dashboardContainerRenderer}</> : null;
};
DashboardRendererComponent.displayName = 'DashboardRendererComponent';
export const DashboardRenderer = React.memo(DashboardRendererComponent);
