/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEGACY_DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import React, { useState, useCallback, useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import type { ViewMode } from '@kbn/embeddable-plugin/common';
import { pick } from 'lodash/fp';
import { useParams } from 'react-router-dom';
import { SecurityPageName } from '../../../../common/constants';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useCapabilities } from '../../../common/lib/kibana';
import { inputsSelectors } from '../../../common/store';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { DashboardRenderer } from '../../components/dashboard_renderer';
import { DashboardToolBar } from '../../components/dashboard_tool_bar';
import { StatusPrompt } from '../../components/status_prompt';
import { DashboardViewPromptState } from '../../hooks/use_dashboard_view_prompt_state';

import { DashboardTitle } from '../../components/dashboard_title';
import { useDashboardRenderer } from '../../hooks/use_dashboard_renderer';

interface DashboardViewProps {
  initialViewMode: ViewMode;
}

const dashboardViewFlexGroupStyle = { minHeight: `calc(100vh - 140px)` };

const DashboardViewComponent: React.FC<DashboardViewProps> = ({
  initialViewMode,
}: DashboardViewProps) => {
  const { fromStr, toStr, from, to } = useDeepEqualSelector((state) =>
    pick(['fromStr', 'toStr', 'from', 'to'], inputsSelectors.globalTimeRangeSelector(state))
  );
  const timeRange = useMemo(() => ({ from, to, fromStr, toStr }), [from, fromStr, to, toStr]);
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const { sourcererDataView } = useSourcererDataView();

  const { show: canReadDashboard } =
    useCapabilities<DashboardCapabilities>(LEGACY_DASHBOARD_APP_ID);
  const errorState = useMemo(
    () => (canReadDashboard ? null : DashboardViewPromptState.NoReadPermission),
    [canReadDashboard]
  );
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const { detailName: savedObjectId } = useParams<{ detailName?: string }>();
  const [dashboardTitle, setDashboardTitle] = useState<string>();

  const { dashboardContainer, handleDashboardLoaded } = useDashboardRenderer();
  const onDashboardToolBarLoad = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
      </FiltersGlobal>
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup
          direction="column"
          style={dashboardViewFlexGroupStyle}
          gutterSize="none"
          data-test-subj="dashboard-view-wrapper"
        >
          <EuiFlexItem grow={false}>
            {dashboardContainer && (
              <HeaderPage
                border
                title={
                  <DashboardTitle
                    dashboardContainer={dashboardContainer}
                    onTitleLoaded={setDashboardTitle}
                  />
                }
                subtitle={
                  <DashboardToolBar
                    dashboardContainer={dashboardContainer}
                    onLoad={onDashboardToolBarLoad}
                  />
                }
              />
            )}
          </EuiFlexItem>
          {!errorState && (
            <EuiFlexItem grow>
              <DashboardRenderer
                query={query}
                filters={filters}
                canReadDashboard={canReadDashboard}
                dashboardContainer={dashboardContainer}
                id={`dashboard-view-${savedObjectId}`}
                onDashboardContainerLoaded={handleDashboardLoaded}
                savedObjectId={savedObjectId}
                timeRange={timeRange}
                viewMode={viewMode}
              />
            </EuiFlexItem>
          )}
          {errorState && (
            <EuiFlexItem data-test-subj="dashboard-view-error-prompt-wrapper" grow>
              <StatusPrompt currentState={errorState} />
            </EuiFlexItem>
          )}
          <SpyRoute
            pageName={SecurityPageName.dashboards}
            state={{ dashboardName: dashboardTitle }}
          />
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    </>
  );
};
DashboardViewComponent.displayName = 'DashboardViewComponent';
export const DashboardView = React.memo(DashboardViewComponent);
