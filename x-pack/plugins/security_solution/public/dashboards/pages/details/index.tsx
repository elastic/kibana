/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';

import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { useParams } from 'react-router-dom';
import { pick } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ViewMode } from '@kbn/embeddable-plugin/common';
import { SecurityPageName } from '../../../../common/constants';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useCapabilities } from '../../../common/lib/kibana';
import { DashboardViewPromptState } from '../../hooks/use_dashboard_view_prompt_state';
import { DashboardRenderer } from '../../components/dashboard_renderer';
import { StatusPrompt } from '../../components/status_prompt';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { HeaderPage } from '../../../common/components/header_page';
import { inputsSelectors } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { DashboardToolBar } from '../../components/dashboard_tool_bar';

import { useDashboardRenderer } from '../../hooks/use_dashboard_renderer';
import { DashboardTitle } from '../../components/dashboard_title';

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

  const { show: canReadDashboard } = useCapabilities<DashboardCapabilities>('dashboard_v2');
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
