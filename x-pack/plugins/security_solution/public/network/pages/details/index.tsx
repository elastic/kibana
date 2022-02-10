/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import {
  FlowTarget,
  FlowTargetSourceDest,
  LastEventIndexKey,
} from '../../../../common/search_strategy';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { LastEventTime } from '../../../common/components/last_event_time';
import { useAnomaliesTableData } from '../../../common/components/ml/anomaly/use_anomalies_table_data';
import { networkToCriteria } from '../../../common/components/ml/criteria/network_to_criteria';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { AnomaliesNetworkTable } from '../../../common/components/ml/tables/anomalies_network_table';
import { manageQuery } from '../../../common/components/page/manage_query';
import { FlowTargetSelectConnected } from '../../components/flow_target_select_connected';
import { IpOverview } from '../../components/details';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useNetworkDetails, ID } from '../../containers/details';
import { useKibana } from '../../../common/lib/kibana';
import { decodeIpv6 } from '../../../common/lib/helpers';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { ConditionalFlexGroup } from '../../pages/navigation/conditional_flex_group';
import { inputsSelectors } from '../../../common/store';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { setNetworkDetailsTablesActivePageToZero } from '../../store/actions';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { OverviewEmpty } from '../../../overview/components/overview_empty';
import { NetworkHttpQueryTable } from './network_http_query_table';
import { NetworkTopCountriesQueryTable } from './network_top_countries_query_table';
import { NetworkTopNFlowQueryTable } from './network_top_n_flow_query_table';
import { TlsQueryTable } from './tls_query_table';
import { UsersQueryTable } from './users_query_table';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { getEsQueryConfig } from '../../../../../../../src/plugins/data/common';
import { networkModel } from '../../store';
import { SecurityPageName } from '../../../app/types';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
export { getBreadcrumbs } from './utils';

const NetworkDetailsManage = manageQuery(IpOverview);

const NetworkDetailsComponent: React.FC = () => {
  const dispatch = useDispatch();
  const { to, from, setQuery, isInitializing } = useGlobalTime();
  const { detailName, flowTarget } = useParams<{
    detailName: string;
    flowTarget: FlowTarget;
  }>();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );

  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const type = networkModel.NetworkType.details;
  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );
  const {
    services: { uiSettings },
  } = useKibana();

  useEffect(() => {
    dispatch(setNetworkDetailsTablesActivePageToZero());
  }, [detailName, dispatch]);

  const { docValueFields, indicesExist, indexPattern, selectedPatterns } = useSourcererDataView();
  const ip = decodeIpv6(detailName);
  const [filterQuery, kqlError] = convertToBuildEsQuery({
    config: getEsQueryConfig(uiSettings),
    indexPattern,
    queries: [query],
    filters,
  });

  useInvalidFilterQuery({ id: ID, filterQuery, kqlError, query, startDate: from, endDate: to });

  const [loading, { id, inspect, networkDetails, refetch }] = useNetworkDetails({
    docValueFields,
    skip: isInitializing,
    filterQuery,
    indexNames: selectedPatterns,
    ip,
  });

  const [isLoadingAnomaliesData, anomaliesData] = useAnomaliesTableData({
    criteriaFields: networkToCriteria(detailName, flowTarget),
    startDate: from,
    endDate: to,
    skip: isInitializing,
  });

  const headerDraggableArguments = useMemo(
    () => ({ field: `${flowTarget}.ip`, value: ip }),
    [flowTarget, ip]
  );

  // When the filterQuery comes back as undefined, it means an error has been thrown and the request should be skipped
  const shouldSkip = useMemo(
    () => isInitializing || filterQuery === undefined,
    [isInitializing, filterQuery]
  );

  return (
    <div data-test-subj="network-details-page">
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar indexPattern={indexPattern} id="global" />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper>
            <HeaderPage
              border
              data-test-subj="network-details-headline"
              draggableArguments={headerDraggableArguments}
              subtitle={
                <LastEventTime
                  docValueFields={docValueFields}
                  indexKey={LastEventIndexKey.ipDetails}
                  indexNames={selectedPatterns}
                  ip={ip}
                />
              }
              title={ip}
            >
              <FlowTargetSelectConnected flowTarget={flowTarget} />
            </HeaderPage>

            <NetworkDetailsManage
              id={id}
              inspect={inspect}
              ip={ip}
              isInDetailsSidePanel={false}
              data={networkDetails}
              anomaliesData={anomaliesData}
              loading={loading}
              isLoadingAnomaliesData={isLoadingAnomaliesData}
              type={type}
              flowTarget={flowTarget}
              refetch={refetch}
              setQuery={setQuery}
              startDate={from}
              endDate={to}
              narrowDateRange={narrowDateRange}
            />

            <EuiHorizontalRule />

            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <NetworkTopNFlowQueryTable
                  endDate={to}
                  filterQuery={filterQuery}
                  flowTarget={FlowTargetSourceDest.source}
                  indexNames={selectedPatterns}
                  ip={ip}
                  skip={shouldSkip}
                  startDate={from}
                  type={type}
                  setQuery={setQuery}
                  indexPattern={indexPattern}
                />
              </EuiFlexItem>

              <EuiFlexItem>
                <NetworkTopNFlowQueryTable
                  endDate={to}
                  flowTarget={FlowTargetSourceDest.destination}
                  filterQuery={filterQuery}
                  indexNames={selectedPatterns}
                  ip={ip}
                  skip={shouldSkip}
                  startDate={from}
                  type={type}
                  setQuery={setQuery}
                  indexPattern={indexPattern}
                />
              </EuiFlexItem>
            </ConditionalFlexGroup>

            <EuiSpacer />

            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <NetworkTopCountriesQueryTable
                  endDate={to}
                  filterQuery={filterQuery}
                  flowTarget={FlowTargetSourceDest.source}
                  indexNames={selectedPatterns}
                  ip={ip}
                  skip={shouldSkip}
                  startDate={from}
                  type={type}
                  setQuery={setQuery}
                  indexPattern={indexPattern}
                />
              </EuiFlexItem>

              <EuiFlexItem>
                <NetworkTopCountriesQueryTable
                  endDate={to}
                  flowTarget={FlowTargetSourceDest.destination}
                  filterQuery={filterQuery}
                  indexNames={selectedPatterns}
                  ip={ip}
                  skip={shouldSkip}
                  startDate={from}
                  type={type}
                  setQuery={setQuery}
                  indexPattern={indexPattern}
                />
              </EuiFlexItem>
            </ConditionalFlexGroup>

            <EuiSpacer />

            <UsersQueryTable
              endDate={to}
              filterQuery={filterQuery}
              flowTarget={flowTarget}
              indexNames={selectedPatterns}
              ip={ip}
              skip={shouldSkip}
              startDate={from}
              type={type}
              setQuery={setQuery}
            />

            <EuiSpacer />

            <NetworkHttpQueryTable
              endDate={to}
              filterQuery={filterQuery}
              indexNames={selectedPatterns}
              ip={ip}
              skip={shouldSkip}
              startDate={from}
              type={type}
              setQuery={setQuery}
            />

            <EuiSpacer />

            <TlsQueryTable
              endDate={to}
              filterQuery={filterQuery}
              flowTarget={flowTarget as unknown as FlowTargetSourceDest}
              indexNames={selectedPatterns}
              ip={ip}
              setQuery={setQuery}
              skip={shouldSkip}
              startDate={from}
              type={type}
            />

            <EuiSpacer />

            <AnomaliesQueryTabBody
              filterQuery={filterQuery}
              setQuery={setQuery}
              startDate={from}
              endDate={to}
              skip={shouldSkip}
              indexNames={selectedPatterns}
              ip={ip}
              type={type}
              flowTarget={flowTarget}
              narrowDateRange={narrowDateRange}
              hideHistogramIfEmpty={true}
              AnomaliesTableComponent={AnomaliesNetworkTable}
            />
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <SecuritySolutionPageWrapper>
          <OverviewEmpty />
        </SecuritySolutionPageWrapper>
      )}

      <SpyRoute pageName={SecurityPageName.network} />
    </div>
  );
};

NetworkDetailsComponent.displayName = 'NetworkDetailsComponent';

export const NetworkDetails = React.memo(NetworkDetailsComponent);
