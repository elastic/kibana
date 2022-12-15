/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { ResponseActionButtonProps } from '@kbn/kubernetes-security-plugin/public/types';
import { TableId } from '../../../common/types';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useKibana } from '../../common/lib/kibana';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { showGlobalFilters } from '../../timelines/components/timeline/helpers';
import { inputsSelectors } from '../../common/store';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { convertToBuildEsQuery } from '../../common/lib/kuery';
import { useInvalidFilterQuery } from '../../common/hooks/use_invalid_filter_query';
import { SessionsView } from '../../common/components/sessions_viewer';
import { kubernetesSessionsHeaders } from './constants';
import { useResponderActionData } from '../../detections/components/endpoint_responder/use_responder_action_data';
import { useUserPrivileges } from '../../common/components/user_privileges';

export const KubernetesContainer = React.memo(() => {
  const { kubernetesSecurity, uiSettings } = useKibana().services;

  const { globalFullScreen } = useGlobalFullScreen();
  const {
    indexPattern,
    // runtimeMappings,
    // loading: isLoadingIndexPattern,
  } = useSourcererDataView();
  const { from, to } = useGlobalTime();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const canAccessResponseConsole = useUserPrivileges().endpointPrivileges.canAccessResponseConsole;

  const [agentIdForResponder, setAgentIdForResponder] = useState<string>('');
  const [filterQuery, kqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters,
      }),
    [filters, indexPattern, uiSettings, query]
  );

  useInvalidFilterQuery({
    id: 'kubernetesQuery',
    filterQuery,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  const renderSessionsView = useCallback(
    (sessionsFilterQuery: string | undefined) => (
      <SessionsView
        tableId={TableId.kubernetesPageSessions}
        endDate={to}
        pageFilters={[]}
        startDate={from}
        filterQuery={sessionsFilterQuery}
        columns={kubernetesSessionsHeaders}
        defaultColumns={kubernetesSessionsHeaders}
      />
    ),
    [from, to]
  );

  const { handleResponseActionsClick, isDisabled, tooltip } = useResponderActionData({
    endpointId: agentIdForResponder,
  });

  const handleTreeNavSelection = useCallback((agentId: string) => {
    setAgentIdForResponder(agentId);
  }, []);

  const responseActionClick = useCallback(() => {
    handleResponseActionsClick();
  }, [handleResponseActionsClick]);

  const responseActionButtonProps: ResponseActionButtonProps = {
    isDisabled,
    canAccessResponseConsole,
    tooltip,
  };

  return (
    <SecuritySolutionPageWrapper noPadding>
      {kubernetesSecurity.getKubernetesPage({
        filter: (
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId: undefined })}>
            <SiemSearchBar id={InputsModelId.global} indexPattern={indexPattern} />
          </FiltersGlobal>
        ),
        indexPattern,
        globalFilter: {
          filterQuery,
          startDate: from,
          endDate: to,
        },
        renderSessionsView,
        responseActionClick,
        handleTreeNavSelection,
        responseActionButtonProps,
      })}
      <SpyRoute pageName={SecurityPageName.kubernetes} />
    </SecuritySolutionPageWrapper>
  );
});

KubernetesContainer.displayName = 'KubernetesContainer';
