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

import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { TableId } from '../../../../../common/types';
import { tableDefaults } from '../../../../common/store/data_table/defaults';
import { dataTableSelectors } from '../../../../common/store/data_table';
import { AlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import type { HostItem } from '../../../../../common/search_strategy';
import { LastEventIndexKey } from '../../../../../common/search_strategy';
import { SecurityPageName } from '../../../../app/types';
import { FiltersGlobal } from '../../../../common/components/filters_global';
import { HeaderPage } from '../../../../common/components/header_page';
import { LastEventTime } from '../../../../common/components/last_event_time';
import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { hostToCriteria } from '../../../../common/components/ml/criteria/host_to_criteria';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { TabNavigationWithBreadcrumbs } from '../../../../common/components/navigation/tab_navigation_with_breadcrumbs';
import { HostOverview } from '../../../../overview/components/host_overview';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';
import { inputsSelectors } from '../../../../common/store';
import { setHostDetailsTablesActivePageToZero } from '../../store/actions';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { HostDetailsTabs } from './details_tabs';
import { navTabsHostDetails } from './nav_tabs';
import type { HostDetailsProps } from './types';
import { type } from './utils';
import { getHostDetailsPageFilters } from './helpers';
import { showGlobalFilters } from '../../../../timelines/components/timeline/helpers';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { Display } from '../display';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../common/hooks/use_selector';
import { ID, useHostDetails } from '../../containers/hosts/details';
import { manageQuery } from '../../../../common/components/page/manage_query';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { LandingPageComponent } from '../../../../common/components/landing_page';
import { AlertCountByRuleByStatus } from '../../../../common/components/alert_count_by_status';
import { useLicense } from '../../../../common/hooks/use_license';
import { ResponderActionButton } from '../../../../detections/components/endpoint_responder/responder_action_button';

const ES_HOST_FIELD = 'host.hostname';
const HostOverviewManage = manageQuery(HostOverview);

const HostDetailsComponent: React.FC<HostDetailsProps> = ({ detailName, hostDetailsPagePath }) => {
  const dispatch = useDispatch();
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => (getTable(state, TableId.hostsPageEvents) ?? tableDefaults).graphEventId
  );
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const { signalIndexName } = useSignalIndex();

  const capabilities = useMlCapabilities();
  const {
    services: { uiSettings },
  } = useKibana();

  const hostDetailsPageFilters: Filter[] = useMemo(
    () => getHostDetailsPageFilters(detailName),
    [detailName]
  );

  const isEnterprisePlus = useLicense().isEnterprise();

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

  const { indexPattern, indicesExist, selectedPatterns } = useSourcererDataView();
  const [loading, { inspect, hostDetails: hostOverview, id, refetch }] = useHostDetails({
    endDate: to,
    startDate: from,
    hostName: detailName,
    indexNames: selectedPatterns,
    skip: selectedPatterns.length === 0,
  });

  const [rawFilteredQuery, kqlError] = useMemo(() => {
    try {
      return [
        buildEsQuery(
          indexPattern,
          [query],
          [...hostDetailsPageFilters, ...globalFilters],
          getEsQueryConfig(uiSettings)
        ),
      ];
    } catch (e) {
      return [undefined, e];
    }
  }, [globalFilters, indexPattern, query, uiSettings, hostDetailsPageFilters]);

  const stringifiedAdditionalFilters = JSON.stringify(rawFilteredQuery);
  useInvalidFilterQuery({
    id: ID,
    filterQuery: stringifiedAdditionalFilters,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  useEffect(() => {
    dispatch(setHostDetailsTablesActivePageToZero());
  }, [dispatch, detailName]);

  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;

  const { hasKibanaREAD, hasIndexRead } = useAlertsPrivileges();
  const canReadAlerts = hasKibanaREAD && hasIndexRead;

  const entityFilter = useMemo(
    () => ({
      field: ES_HOST_FIELD,
      value: detailName,
    }),
    [detailName]
  );

  return (
    <>
      {indicesExist ? (
        <>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar indexPattern={indexPattern} id={InputsModelId.global} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper
            noPadding={globalFullScreen}
            data-test-subj="hostDetailsPage"
          >
            <Display show={!globalFullScreen}>
              <HeaderPage
                border
                subtitle={
                  <LastEventTime
                    indexKey={LastEventIndexKey.hostDetails}
                    hostName={detailName}
                    indexNames={selectedPatterns}
                  />
                }
                title={detailName}
                rightSideItems={[
                  hostOverview.endpoint?.fleetAgentId && (
                    <ResponderActionButton endpointId={hostOverview.endpoint?.fleetAgentId} />
                  ),
                ]}
              />

              <AnomalyTableProvider
                criteriaFields={hostToCriteria(hostOverview)}
                startDate={from}
                endDate={to}
                skip={isInitializing}
              >
                {({ isLoadingAnomaliesData, anomaliesData }) => (
                  <HostOverviewManage
                    id={id}
                    isInDetailsSidePanel={false}
                    data={hostOverview as HostItem}
                    anomaliesData={anomaliesData}
                    isLoadingAnomaliesData={isLoadingAnomaliesData}
                    loading={loading}
                    startDate={from}
                    endDate={to}
                    narrowDateRange={narrowDateRange}
                    setQuery={setQuery}
                    refetch={refetch}
                    inspect={inspect}
                    hostName={detailName}
                    indexNames={selectedPatterns}
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

              <TabNavigationWithBreadcrumbs
                navTabs={navTabsHostDetails({
                  hasMlUserPermissions: hasMlUserPermissions(capabilities),
                  isRiskyHostsEnabled: isPlatinumOrTrialLicense,
                  hostName: detailName,
                  isEnterprise: isEnterprisePlus,
                })}
              />

              <EuiSpacer />
            </Display>

            <HostDetailsTabs
              indexNames={selectedPatterns}
              isInitializing={isInitializing}
              deleteQuery={deleteQuery}
              hostDetailsFilter={hostDetailsPageFilters}
              to={to}
              from={from}
              detailName={detailName}
              type={type}
              setQuery={setQuery}
              filterQuery={stringifiedAdditionalFilters}
              hostDetailsPagePath={hostDetailsPagePath}
              indexPattern={indexPattern}
            />
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.hosts} />
    </>
  );
};

HostDetailsComponent.displayName = 'HostDetailsComponent';

export const HostDetails = React.memo(HostDetailsComponent);
