/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { LEGACY_DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public';

import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { useHistory, useParams } from 'react-router-dom';

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { pick } from 'lodash/fp';
import { SecurityPageName } from '../../../../common/constants';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useCapabilities, useKibana } from '../../../common/lib/kibana';
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
import { LinkButton } from '../../../common/components/links';
import {
  EDIT_DASHBOARD_BUTTON_TITLE,
  RESTORE_URL_ERROR_TITLE,
  SAVE_STATE_IN_URL_ERROR_TITLE,
} from './translations';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useDashboardAppLink } from '../../hooks/use_dashboard_app_link';
import { inputsSelectors } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
type DashboardDetails = Record<string, string | undefined>;

const DashboardViewComponent: React.FC = () => {
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
  const { indexPattern, indicesExist } = useSourcererDataView();
  const {
    services: { uiSettings },
  } = useKibana();

  const toasts = useAppToasts();

  const { show: canReadDashboard, showWriteControls } =
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
  const history = useHistory();
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

  const editDashboardUrl = useDashboardAppLink({
    query,
    filters,
    timeRange,
    uiSettings,
    savedObjectId,
    kbnUrlStateStorage,
  });

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
        <HeaderPage border title={DASHBOARD_PAGE_TITLE}>
          {showWriteControls && (
            <LinkButton color="primary" fill iconType="pencil" href={editDashboardUrl}>
              {EDIT_DASHBOARD_BUTTON_TITLE}
            </LinkButton>
          )}
        </HeaderPage>

        {indicesExist && (
          <DashboardRenderer
            query={query}
            filters={filters}
            canReadDashboard={canReadDashboard}
            id={`dashboard-${savedObjectId}`}
            onDashboardContainerLoaded={onDashboardContainerLoaded}
            savedObjectId={savedObjectId}
            timeRange={timeRange}
          />
        )}

        <StatusPropmpt currentState={currentState} />
        <SpyRoute pageName={SecurityPageName.dashboardView} state={dashboardDetails} />
      </SecuritySolutionPageWrapper>
    </>
  );
};
DashboardViewComponent.displayName = 'DashboardViewComponent';
export const DashboardView = React.memo(DashboardViewComponent);
