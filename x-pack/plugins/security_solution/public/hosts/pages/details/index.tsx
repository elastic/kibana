/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { HostItem, LastEventIndexKey } from '../../../../common/search_strategy';
import { SecurityPageName } from '../../../app/types';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { LastEventTime } from '../../../common/components/last_event_time';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { hostToCriteria } from '../../../common/components/ml/criteria/host_to_criteria';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { SiemNavigation } from '../../../common/components/navigation';
import { HostsDetailsKpiComponent } from '../../components/kpi_hosts';
import { HostOverview } from '../../../overview/components/host_overview';
import { manageQuery } from '../../../common/components/page/manage_query';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { WrapperPage } from '../../../common/components/wrapper_page';
import { HostOverviewByNameQuery } from '../../containers/hosts/details';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { inputsSelectors } from '../../../common/store';
import { setHostDetailsTablesActivePageToZero } from '../../store/actions';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { esQuery, Filter } from '../../../../../../../src/plugins/data/public';

import { OverviewEmpty } from '../../../overview/components/overview_empty';
import { HostDetailsTabs } from './details_tabs';
import { navTabsHostDetails } from './nav_tabs';
import { HostDetailsProps } from './types';
import { type } from './utils';
import { getHostDetailsPageFilters } from './helpers';
import { showGlobalFilters } from '../../../timelines/components/timeline/helpers';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../display';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';

const HostOverviewManage = manageQuery(HostOverview);

const HostDetailsComponent: React.FC<HostDetailsProps> = ({ detailName, hostDetailsPagePath }) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => (getTimeline(state, TimelineId.hostsPageEvents) ?? timelineDefaults).graphEventId
  );
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();

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
      dispatch(
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        })
      );
    },
    [dispatch]
  );

  const { docValueFields, indicesExist, indexPattern, selectedPatterns } = useSourcererScope();
  const filterQuery = convertToBuildEsQuery({
    config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
    indexPattern,
    queries: [query],
    filters: getFilters(),
  });

  useEffect(() => {
    dispatch(setHostDetailsTablesActivePageToZero());
  }, [dispatch, detailName]);

  return (
    <>
      {indicesExist ? (
        <>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar indexPattern={indexPattern} id="global" />
          </FiltersGlobal>

          <WrapperPage noPadding={globalFullScreen}>
            <Display show={!globalFullScreen}>
              <HeaderPage
                border
                subtitle={
                  <LastEventTime
                    docValueFields={docValueFields}
                    indexKey={LastEventIndexKey.hostDetails}
                    hostName={detailName}
                    indexNames={selectedPatterns}
                  />
                }
                title={detailName}
              />

              <HostOverviewByNameQuery
                indexNames={selectedPatterns}
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
                        docValueFields={docValueFields}
                        id={id}
                        inspect={inspect}
                        refetch={refetch}
                        setQuery={setQuery}
                        data={hostOverview as HostItem}
                        anomaliesData={anomaliesData}
                        isLoadingAnomaliesData={isLoadingAnomaliesData}
                        indexNames={selectedPatterns}
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

              <HostsDetailsKpiComponent
                filterQuery={filterQuery}
                from={from}
                indexNames={selectedPatterns}
                setQuery={setQuery}
                to={to}
                narrowDateRange={narrowDateRange}
                skip={isInitializing}
              />

              <EuiSpacer />

              <SiemNavigation
                navTabs={navTabsHostDetails(detailName, hasMlUserPermissions(capabilities))}
              />

              <EuiSpacer />
            </Display>

            <HostDetailsTabs
              docValueFields={docValueFields}
              indexNames={selectedPatterns}
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
        </>
      ) : (
        <WrapperPage>
          <HeaderPage border title={detailName} />

          <OverviewEmpty />
        </WrapperPage>
      )}

      <SpyRoute pageName={SecurityPageName.hosts} />
    </>
  );
};

HostDetailsComponent.displayName = 'HostDetailsComponent';

export const HostDetails = React.memo(HostDetailsComponent);
