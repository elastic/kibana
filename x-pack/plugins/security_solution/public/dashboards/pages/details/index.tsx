/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { LEGACY_DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public';

import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { useParams } from 'react-router-dom';

import { SecurityPageName } from '../../../../common/constants';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useCapabilities } from '../../../common/lib/kibana';
import { DashboardViewPromptState } from '../../hooks/use_dashboard_view_prompt_state';
import { DashboardRenderer } from '../../components/dashboard_renderer';
import { StatusPropmpt } from '../../components/status_prompt';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { HeaderPage } from '../../../common/components/header_page';
import { DASHBOARD_PAGE_TITLE } from '../translations';

type DashboardDetails = Record<string, string | undefined>;

const DashboardViewComponent: React.FC = () => {
  const { from, to } = useGlobalTime();
  const { indexPattern, indicesExist } = useSourcererDataView();

  const { show: canReadDashboard } =
    useCapabilities<DashboardCapabilities>(LEGACY_DASHBOARD_APP_ID);
  const [currentState, setCurrentState] = useState<DashboardViewPromptState | null>(
    canReadDashboard ? null : DashboardViewPromptState.NoReadPermission
  );
  const [dashboardDetails, setDashboardDetails] = useState<DashboardDetails>();
  const onDashboardContainerLoaded = useCallback((dashboardContainer: DashboardContainer) => {
    const dashboardTitle = dashboardContainer.getTitle();
    setDashboardDetails({ dashboardTitle });
  }, []);
  const { detailName: savedObjectId } = useParams<{ detailName?: string }>();

  useEffect(() => {
    if (!indicesExist) {
      setCurrentState(DashboardViewPromptState.IndicesNotFound);
    }
  }, [indicesExist]);
  return (
    <>
      {indicesExist && (
        <FiltersGlobal>
          <SiemSearchBar id={InputsModelId.global} indexPattern={indexPattern} />
        </FiltersGlobal>
      )}
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={DASHBOARD_PAGE_TITLE} />

        {indicesExist && (
          <DashboardRenderer
            canReadDashboard={canReadDashboard}
            from={from}
            id={`dashboard-${savedObjectId}`}
            onDashboardContainerLoaded={onDashboardContainerLoaded}
            savedObjectId={savedObjectId}
            to={to}
          />
        )}

        <StatusPropmpt currentState={currentState} />
        <SpyRoute pageName={SecurityPageName.dashboardsLanding} state={dashboardDetails} />
      </SecuritySolutionPageWrapper>
    </>
  );
};
DashboardViewComponent.displayName = 'DashboardViewComponent';
export const DashboardView = React.memo(DashboardViewComponent);
