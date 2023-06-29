/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { LEGACY_DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';

import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { useParams } from 'react-router-dom';

import { pick } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
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
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { HeaderPage } from '../../../common/components/header_page';
import { DASHBOARD_NOT_FOUND_TITLE } from './translations';
import { inputsSelectors } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { DashboardToolBar } from '../../components/dashboard_tool_bar';

type DashboardDetails = Record<string, string>;

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
  const { indexPattern } = useSourcererDataView();
  const [dashboardContainer, setDashboardContainer] = useState<DashboardAPI>();

  const { show: canReadDashboard, showWriteControls } =
    useCapabilities<DashboardCapabilities>(LEGACY_DASHBOARD_APP_ID);
  const errorState = useMemo(
    () => (canReadDashboard ? null : DashboardViewPromptState.NoReadPermission),
    [canReadDashboard]
  );
  const [dashboardDetails, setDashboardDetails] = useState<DashboardDetails | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  const onDashboardToolBarLoad = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);
  const onDashboardContainerLoaded = useCallback((dashboard: DashboardAPI) => {
    if (dashboard) {
      const title = dashboard.getTitle().trim();
      if (title) {
        setDashboardDetails({ title });
      } else {
        setDashboardDetails({ title: DASHBOARD_NOT_FOUND_TITLE });
      }
    }
  }, []);

  const handleDashboardLoaded = useCallback(
    (container: DashboardAPI) => {
      setDashboardContainer(container);
      onDashboardContainerLoaded(container);
    },
    [onDashboardContainerLoaded]
  );

  const dashboardExists = useMemo(() => dashboardDetails != null, [dashboardDetails]);
  const { detailName: savedObjectId } = useParams<{ detailName?: string }>();

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar id={InputsModelId.global} indexPattern={indexPattern} />
      </FiltersGlobal>
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup
          direction="column"
          style={dashboardViewFlexGroupStyle}
          gutterSize="none"
          data-test-subj="dashboard-view-wrapper"
        >
          <EuiFlexItem grow={false}>
            <HeaderPage border title={dashboardDetails?.title ?? <EuiLoadingSpinner size="m" />}>
              {showWriteControls && dashboardExists && dashboardContainer && savedObjectId && (
                <DashboardToolBar
                  dashboardContainer={dashboardContainer}
                  onLoad={onDashboardToolBarLoad}
                  dashboardId={savedObjectId}
                />
              )}
            </HeaderPage>
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
            state={{ dashboardName: dashboardDetails?.title }}
          />
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    </>
  );
};
DashboardViewComponent.displayName = 'DashboardViewComponent';
export const DashboardView = React.memo(DashboardViewComponent);
