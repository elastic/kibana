/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiWindowEvent,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { dataTableSelectors, TableId } from '@kbn/securitysolution-data-table';
import {
  useAssetCriticalityData,
  useAssetCriticalityPrivileges,
} from '../../../../entity_analytics/components/asset_criticality/use_asset_criticality';
import {
  AssetCriticalitySelector,
  AssetCriticalityTitle,
} from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { AlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { AlertCountByRuleByStatus } from '../../../../common/components/alert_count_by_status';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { SecurityPageName } from '../../../../app/types';
import { FiltersGlobal } from '../../../../common/components/filters_global';
import { HeaderPage } from '../../../../common/components/header_page';
import { TabNavigation } from '../../../../common/components/navigation/tab_navigation';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';
import { inputsSelectors } from '../../../../common/store';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { setUsersDetailsTablesActivePageToZero } from '../../store/actions';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { UsersDetailsTabs } from './details_tabs';
import { navTabsUsersDetails } from './nav_tabs';
import type { UsersDetailsProps } from './types';
import { getUsersDetailsPageFilters } from './helpers';
import { showGlobalFilters } from '../../../../timelines/components/timeline/helpers';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { timelineDefaults } from '../../../../timelines/store/defaults';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { LastEventTime } from '../../../../common/components/last_event_time';
import { LastEventIndexKey } from '../../../../../common/search_strategy';

import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { UserOverview } from '../../../../overview/components/user_overview';
import { useObservedUserDetails } from '../../containers/users/observed_details';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { getCriteriaFromUsersType } from '../../../../common/components/ml/criteria/get_criteria_from_users_type';
import { UsersType } from '../../store/model';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { EmptyPrompt } from '../../../../common/components/empty_prompt';
import { useHasSecurityCapability } from '../../../../helper_hooks';

const QUERY_ID = 'UsersDetailsQueryId';
const ES_USER_FIELD = 'user.name';

const UsersDetailsComponent: React.FC<UsersDetailsProps> = ({
  detailName,
  usersDetailsPagePath,
}) => {
  const dispatch = useDispatch();
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => (getTable(state, TableId.hostsPageEvents) ?? timelineDefaults).graphEventId
  );
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { signalIndexName } = useSignalIndex();
  const { hasKibanaREAD, hasIndexRead } = useAlertsPrivileges();
  const canReadAlerts = hasKibanaREAD && hasIndexRead;

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();

  const {
    services: { uiSettings },
  } = useKibana();

  const usersDetailsPageFilters: Filter[] = useMemo(
    () => getUsersDetailsPageFilters(detailName),
    [detailName]
  );

  const { indicesExist, indexPattern, selectedPatterns, sourcererDataView } =
    useSourcererDataView();

  const [rawFilteredQuery, kqlError] = useMemo(() => {
    try {
      return [
        buildEsQuery(
          indexPattern,
          [query],
          [...usersDetailsPageFilters, ...globalFilters],
          getEsQueryConfig(uiSettings)
        ),
      ];
    } catch (e) {
      return [undefined, e];
    }
  }, [globalFilters, indexPattern, query, uiSettings, usersDetailsPageFilters]);

  const stringifiedAdditionalFilters = JSON.stringify(rawFilteredQuery);
  useInvalidFilterQuery({
    id: QUERY_ID,
    filterQuery: stringifiedAdditionalFilters,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  useEffect(() => {
    dispatch(setUsersDetailsTablesActivePageToZero());
  }, [dispatch, detailName]);

  const [loading, { inspect, userDetails, refetch }] = useObservedUserDetails({
    id: QUERY_ID,
    endDate: to,
    startDate: from,
    userName: detailName,
    indexNames: selectedPatterns,
    skip: selectedPatterns.length === 0,
  });

  const capabilities = useMlCapabilities();

  useQueryInspector({ setQuery, deleteQuery, refetch, inspect, loading, queryId: QUERY_ID });

  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );

  const entityFilter = useMemo(
    () => ({
      field: ES_USER_FIELD,
      value: detailName,
    }),
    [detailName]
  );

  const entity = useMemo(() => ({ type: 'user' as const, name: detailName }), [detailName]);
  const privileges = useAssetCriticalityPrivileges(entity.name);
  const canReadAssetCriticality = !!privileges.data?.has_read_permissions;
  const criticality = useAssetCriticalityData({
    entity,
    enabled: canReadAssetCriticality,
  });

  return (
    <>
      {indicesExist ? (
        <>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar sourcererDataView={sourcererDataView} id={InputsModelId.global} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
            <HeaderPage
              subtitle={
                <LastEventTime
                  indexKey={LastEventIndexKey.userDetails}
                  indexNames={selectedPatterns}
                  userName={detailName}
                />
              }
              title={detailName}
            />

            {canReadAssetCriticality && (
              <>
                <EuiHorizontalRule margin="m" />
                <AssetCriticalityTitle />
                <EuiSpacer size="s" />
                <AssetCriticalitySelector compressed criticality={criticality} entity={entity} />
                <EuiHorizontalRule margin="m" />
              </>
            )}

            <AnomalyTableProvider
              criteriaFields={getCriteriaFromUsersType(UsersType.details, detailName)}
              startDate={from}
              endDate={to}
              skip={isInitializing}
            >
              {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
                <UserOverview
                  userName={detailName}
                  id={QUERY_ID}
                  isInDetailsSidePanel={false}
                  data={userDetails}
                  anomaliesData={anomaliesData}
                  isLoadingAnomaliesData={isLoadingAnomaliesData}
                  loading={loading}
                  startDate={from}
                  endDate={to}
                  narrowDateRange={narrowDateRange}
                  indexPatterns={selectedPatterns}
                  jobNameById={jobNameById}
                />
              )}
            </AnomalyTableProvider>
            <EuiHorizontalRule />
            <EuiSpacer />

            {canReadAlerts && (
              <>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <AlertsByStatus
                      signalIndexName={signalIndexName}
                      entityFilter={entityFilter}
                      additionalFilters={rawFilteredQuery ? [rawFilteredQuery] : []}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <AlertCountByRuleByStatus
                      entityFilter={entityFilter}
                      signalIndexName={signalIndexName}
                      additionalFilters={rawFilteredQuery ? [rawFilteredQuery] : []}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer />
              </>
            )}

            <TabNavigation
              navTabs={navTabsUsersDetails(
                detailName,
                hasMlUserPermissions(capabilities),
                hasEntityAnalyticsCapability
              )}
            />
            <EuiSpacer />
            <UsersDetailsTabs
              deleteQuery={deleteQuery}
              detailName={detailName}
              filterQuery={stringifiedAdditionalFilters}
              from={from}
              indexNames={selectedPatterns}
              indexPattern={indexPattern}
              isInitializing={isInitializing}
              userDetailFilter={usersDetailsPageFilters}
              setQuery={setQuery}
              to={to}
              type={UsersType.details}
              usersDetailsPagePath={usersDetailsPagePath}
            />
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.users} />
    </>
  );
};

UsersDetailsComponent.displayName = 'UsersDetailsComponent';

export const UsersDetails = React.memo(UsersDetailsComponent);
