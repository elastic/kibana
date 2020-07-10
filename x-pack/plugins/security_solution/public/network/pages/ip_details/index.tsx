/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { StickyContainer } from 'react-sticky';

import { useGlobalTime } from '../../../common/containers/use_global_time';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { LastEventTime } from '../../../common/components/last_event_time';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { networkToCriteria } from '../../../common/components/ml/criteria/network_to_criteria';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { AnomaliesNetworkTable } from '../../../common/components/ml/tables/anomalies_network_table';
import { manageQuery } from '../../../common/components/page/manage_query';
import { FlowTargetSelectConnected } from '../../components/flow_target_select_connected';
import { IpOverview } from '../../components/ip_overview';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { WrapperPage } from '../../../common/components/wrapper_page';
import { IpOverviewQuery } from '../../containers/ip_overview';
import { useWithSource } from '../../../common/containers/source';
import { FlowTargetSourceDest, LastEventIndexKey } from '../../../graphql/types';
import { useKibana } from '../../../common/lib/kibana';
import { decodeIpv6 } from '../../../common/lib/helpers';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { ConditionalFlexGroup } from '../../pages/navigation/conditional_flex_group';
import { State, inputsSelectors } from '../../../common/store';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { setIpDetailsTablesActivePageToZero as dispatchIpDetailsTablesActivePageToZero } from '../../store/actions';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { OverviewEmpty } from '../../../overview/components/overview_empty';
import { NetworkHttpQueryTable } from './network_http_query_table';
import { NetworkTopCountriesQueryTable } from './network_top_countries_query_table';
import { NetworkTopNFlowQueryTable } from './network_top_n_flow_query_table';
import { TlsQueryTable } from './tls_query_table';
import { IPDetailsComponentProps } from './types';
import { UsersQueryTable } from './users_query_table';
import { AnomaliesQueryTabBody } from '../../../common/containers/anomalies/anomalies_query_tab_body';
import { esQuery } from '../../../../../../../src/plugins/data/public';
import { networkModel } from '../../store';
import { SecurityPageName } from '../../../app/types';
export { getBreadcrumbs } from './utils';

const IpOverviewManage = manageQuery(IpOverview);

export const IPDetailsComponent: React.FC<IPDetailsComponentProps & PropsFromRedux> = ({
  detailName,
  filters,
  flowTarget,
  query,
  setAbsoluteRangeDatePicker,
  setIpDetailsTablesActivePageToZero,
}) => {
  const { to, from, setQuery, isInitializing } = useGlobalTime();
  const type = networkModel.NetworkType.details;
  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      setAbsoluteRangeDatePicker({
        id: 'global',
        from: fromTo.from,
        to: fromTo.to,
      });
    },
    [setAbsoluteRangeDatePicker]
  );
  const {
    services: { uiSettings },
  } = useKibana();

  useEffect(() => {
    setIpDetailsTablesActivePageToZero();
  }, [detailName, setIpDetailsTablesActivePageToZero]);

  const { docValueFields, indicesExist, indexPattern } = useWithSource();
  const ip = decodeIpv6(detailName);
  const filterQuery = convertToBuildEsQuery({
    config: esQuery.getEsQueryConfig(uiSettings),
    indexPattern,
    queries: [query],
    filters,
  });

  return (
    <div data-test-subj="ip-details-page">
      {indicesExist ? (
        <StickyContainer>
          <FiltersGlobal>
            <SiemSearchBar indexPattern={indexPattern} id="global" />
          </FiltersGlobal>

          <WrapperPage>
            <HeaderPage
              border
              data-test-subj="ip-details-headline"
              draggableArguments={{ field: `${flowTarget}.ip`, value: ip }}
              subtitle={<LastEventTime indexKey={LastEventIndexKey.ipDetails} ip={ip} />}
              title={ip}
            >
              <FlowTargetSelectConnected flowTarget={flowTarget} />
            </HeaderPage>

            <IpOverviewQuery
              docValueFields={docValueFields}
              skip={isInitializing}
              sourceId="default"
              filterQuery={filterQuery}
              type={type}
              ip={ip}
            >
              {({ id, inspect, ipOverviewData, loading, refetch }) => (
                <AnomalyTableProvider
                  criteriaFields={networkToCriteria(detailName, flowTarget)}
                  startDate={from}
                  endDate={to}
                  skip={isInitializing}
                >
                  {({ isLoadingAnomaliesData, anomaliesData }) => (
                    <IpOverviewManage
                      id={id}
                      inspect={inspect}
                      ip={ip}
                      data={ipOverviewData}
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
                  )}
                </AnomalyTableProvider>
              )}
            </IpOverviewQuery>

            <EuiHorizontalRule />

            <ConditionalFlexGroup direction="column">
              <EuiFlexItem>
                <NetworkTopNFlowQueryTable
                  endDate={to}
                  filterQuery={filterQuery}
                  flowTarget={FlowTargetSourceDest.source}
                  ip={ip}
                  skip={isInitializing}
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
                  ip={ip}
                  skip={isInitializing}
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
                  ip={ip}
                  skip={isInitializing}
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
                  ip={ip}
                  skip={isInitializing}
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
              ip={ip}
              skip={isInitializing}
              startDate={from}
              type={type}
              setQuery={setQuery}
            />

            <EuiSpacer />

            <NetworkHttpQueryTable
              endDate={to}
              filterQuery={filterQuery}
              ip={ip}
              skip={isInitializing}
              startDate={from}
              type={type}
              setQuery={setQuery}
            />

            <EuiSpacer />

            <TlsQueryTable
              endDate={to}
              filterQuery={filterQuery}
              flowTarget={(flowTarget as unknown) as FlowTargetSourceDest}
              ip={ip}
              setQuery={setQuery}
              skip={isInitializing}
              startDate={from}
              type={type}
            />

            <EuiSpacer />

            <AnomaliesQueryTabBody
              filterQuery={filterQuery}
              setQuery={setQuery}
              startDate={from}
              endDate={to}
              skip={isInitializing}
              ip={ip}
              type={type}
              flowTarget={flowTarget}
              narrowDateRange={narrowDateRange}
              hideHistogramIfEmpty={true}
              AnomaliesTableComponent={AnomaliesNetworkTable}
            />
          </WrapperPage>
        </StickyContainer>
      ) : (
        <WrapperPage>
          <HeaderPage border title={ip} />

          <OverviewEmpty />
        </WrapperPage>
      )}

      <SpyRoute pageName={SecurityPageName.network} />
    </div>
  );
};
IPDetailsComponent.displayName = 'IPDetailsComponent';

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();

  return (state: State) => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
  setIpDetailsTablesActivePageToZero: dispatchIpDetailsTablesActivePageToZero,
};

export const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const IPDetails = connector(React.memo(IPDetailsComponent));
