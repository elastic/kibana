/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useCallback, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { StickyContainer } from 'react-sticky';

import { SecurityPageName } from '../../../app/types';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { LastEventTime } from '../../../common/components/last_event_time';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { hostToCriteria } from '../../../common/components/ml/criteria/host_to_criteria';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../common/components/ml_popover/hooks/use_ml_capabilities';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { SiemNavigation } from '../../../common/components/navigation';
import { KpiHostsComponent } from '../../components/kpi_hosts';
import { HostOverview } from '../../../overview/components/host_overview';
import { manageQuery } from '../../../common/components/page/manage_query';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { WrapperPage } from '../../../common/components/wrapper_page';
import { HostOverviewByNameQuery } from '../../containers/hosts/overview';
import { KpiHostDetailsQuery } from '../../containers/kpi_host_details';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useWithSource } from '../../../common/containers/source';
import { LastEventIndexKey } from '../../../graphql/types';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { inputsSelectors, State } from '../../../common/store';
import { setHostDetailsTablesActivePageToZero as dispatchHostDetailsTablesActivePageToZero } from '../../store/actions';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { esQuery, Filter } from '../../../../../../../src/plugins/data/public';

import { OverviewEmpty } from '../../../overview/components/overview_empty';
import { HostDetailsTabs } from './details_tabs';
import { navTabsHostDetails } from './nav_tabs';
import { HostDetailsProps } from './types';
import { type } from './utils';
import { getHostDetailsPageFilters } from './helpers';

const HostOverviewManage = manageQuery(HostOverview);
const KpiHostDetailsManage = manageQuery(KpiHostsComponent);

const HostDetailsComponent = React.memo<HostDetailsProps & PropsFromRedux>(
  ({
    filters,
    query,
    setAbsoluteRangeDatePicker,
    setHostDetailsTablesActivePageToZero,
    detailName,
    hostDetailsPagePath,
  }) => {
    const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
    useEffect(() => {
      setHostDetailsTablesActivePageToZero();
    }, [setHostDetailsTablesActivePageToZero, detailName]);
    const capabilities = useMlCapabilities();
    const kibana = useKibana();
    const hostDetailsPageFilters: Filter[] = useMemo(() => getHostDetailsPageFilters(detailName), [
      detailName,
    ]);
    const getFilters = () => [...hostDetailsPageFilters, ...filters];
    const narrowDateRange = useCallback<UpdateDateRange>(
      ({ x }) => {
        if (!x) {
          return;
        }
        const [min, max] = x;
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );
    const { indicesExist, indexPattern } = useWithSource();
    const filterQuery = convertToBuildEsQuery({
      config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
      indexPattern,
      queries: [query],
      filters: getFilters(),
    });

    return (
      <>
        {indicesExist ? (
          <StickyContainer>
            <FiltersGlobal>
              <SiemSearchBar indexPattern={indexPattern} id="global" />
            </FiltersGlobal>

            <WrapperPage>
              <HeaderPage
                border
                subtitle={
                  <LastEventTime indexKey={LastEventIndexKey.hostDetails} hostName={detailName} />
                }
                title={detailName}
              />

              <HostOverviewByNameQuery
                sourceId="default"
                hostName={detailName}
                skip={isInitializing}
                startDate={from}
                endDate={to}
              >
                {({ hostOverview, loading, id, inspect, refetch }) => (
                  <AnomalyTableProvider
                    criteriaFields={hostToCriteria(hostOverview)}
                    startDate={from}
                    endDate={to}
                    skip={isInitializing}
                  >
                    {({ isLoadingAnomaliesData, anomaliesData }) => (
                      <HostOverviewManage
                        id={id}
                        inspect={inspect}
                        refetch={refetch}
                        setQuery={setQuery}
                        data={hostOverview}
                        anomaliesData={anomaliesData}
                        isLoadingAnomaliesData={isLoadingAnomaliesData}
                        loading={loading}
                        startDate={from}
                        endDate={to}
                        narrowDateRange={(score, interval) => {
                          const fromTo = scoreIntervalToDateTime(score, interval);
                          setAbsoluteRangeDatePicker({
                            id: 'global',
                            from: fromTo.from,
                            to: fromTo.to,
                          });
                        }}
                      />
                    )}
                  </AnomalyTableProvider>
                )}
              </HostOverviewByNameQuery>

              <EuiHorizontalRule />

              <KpiHostDetailsQuery
                sourceId="default"
                filterQuery={filterQuery}
                skip={isInitializing}
                startDate={from}
                endDate={to}
              >
                {({ kpiHostDetails, id, inspect, loading, refetch }) => (
                  <KpiHostDetailsManage
                    data={kpiHostDetails}
                    from={from}
                    id={id}
                    inspect={inspect}
                    loading={loading}
                    refetch={refetch}
                    setQuery={setQuery}
                    to={to}
                    narrowDateRange={narrowDateRange}
                  />
                )}
              </KpiHostDetailsQuery>

              <EuiSpacer />

              <SiemNavigation
                navTabs={navTabsHostDetails(detailName, hasMlUserPermissions(capabilities))}
              />

              <EuiSpacer />

              <HostDetailsTabs
                isInitializing={isInitializing}
                deleteQuery={deleteQuery}
                pageFilters={hostDetailsPageFilters}
                to={to}
                from={from}
                detailName={detailName}
                type={type}
                setQuery={setQuery}
                filterQuery={filterQuery}
                hostDetailsPagePath={hostDetailsPagePath}
                indexPattern={indexPattern}
                setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
              />
            </WrapperPage>
          </StickyContainer>
        ) : (
          <WrapperPage>
            <HeaderPage border title={detailName} />

            <OverviewEmpty />
          </WrapperPage>
        )}

        <SpyRoute pageName={SecurityPageName.hosts} />
      </>
    );
  }
);
HostDetailsComponent.displayName = 'HostDetailsComponent';

export const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  return (state: State) => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
  setHostDetailsTablesActivePageToZero: dispatchHostDetailsTablesActivePageToZero,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const HostDetails = connector(HostDetailsComponent);
