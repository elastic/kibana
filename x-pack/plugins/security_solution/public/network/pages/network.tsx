/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { useParams } from 'react-router-dom';

import { esQuery } from '../../../../../../src/plugins/data/public';
import { SecurityPageName } from '../../app/types';
import { UpdateDateRange } from '../../common/components/charts/common';
import { EmbeddedMap } from '../components/embeddables/embedded_map';
import { FiltersGlobal } from '../../common/components/filters_global';
import { HeaderPage } from '../../common/components/header_page';
import { LastEventTime } from '../../common/components/last_event_time';
import { SiemNavigation } from '../../common/components/navigation';
import { manageQuery } from '../../common/components/page/manage_query';
import { KpiNetworkComponent } from '..//components/kpi_network';
import { SiemSearchBar } from '../../common/components/search_bar';
import { WrapperPage } from '../../common/components/wrapper_page';
import { KpiNetworkQuery } from '../../network/containers/kpi_network';
import { useFullScreen } from '../../common/containers/use_full_screen';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useWithSource } from '../../common/containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/keury';
import { State, inputsSelectors } from '../../common/store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../common/store/inputs/actions';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { Display } from '../../hosts/pages/display';
import { networkModel } from '../store';
import { navTabsNetwork, NetworkRoutes, NetworkRoutesLoading } from './navigation';
import { filterNetworkData } from './navigation/alerts_query_tab_body';
import { OverviewEmpty } from '../../overview/components/overview_empty';
import * as i18n from './translations';
import { NetworkComponentProps } from './types';
import { NetworkRouteType } from './navigation/types';
import { showGlobalFilters } from '../../timelines/components/timeline/helpers';
import { timelineSelectors } from '../../timelines/store/timeline';
import { TimelineId } from '../../../common/types/timeline';
import { timelineDefaults } from '../../timelines/store/timeline/defaults';
import { TimelineModel } from '../../timelines/store/timeline/model';

const KpiNetworkComponentManage = manageQuery(KpiNetworkComponent);
const sourceId = 'default';

const NetworkComponent = React.memo<NetworkComponentProps & PropsFromRedux>(
  ({
    filters,
    graphEventId,
    query,
    setAbsoluteRangeDatePicker,
    networkPagePath,
    hasMlUserPermissions,
    capabilitiesFetched,
  }) => {
    const { to, from, setQuery, isInitializing } = useGlobalTime();
    const { globalFullScreen } = useFullScreen();
    const kibana = useKibana();
    const { tabName } = useParams<{ tabName: string }>();

    const tabsFilters = useMemo(() => {
      if (tabName === NetworkRouteType.alerts) {
        return filters.length > 0 ? [...filters, ...filterNetworkData] : filterNetworkData;
      }
      return filters;
    }, [tabName, filters]);

    const narrowDateRange = useCallback<UpdateDateRange>(
      ({ x }) => {
        if (!x) {
          return;
        }
        const [min, max] = x;
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        });
      },
      [setAbsoluteRangeDatePicker]
    );

    const { indicesExist, indexPattern } = useWithSource(sourceId);
    const filterQuery = convertToBuildEsQuery({
      config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
      indexPattern,
      queries: [query],
      filters,
    });
    const tabsFilterQuery = convertToBuildEsQuery({
      config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
      indexPattern,
      queries: [query],
      filters: tabsFilters,
    });

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
                  subtitle={<LastEventTime indexKey={LastEventIndexKey.network} />}
                  title={i18n.PAGE_TITLE}
                />

                <EmbeddedMap
                  query={query}
                  filters={filters}
                  startDate={from}
                  endDate={to}
                  setQuery={setQuery}
                />

                <EuiSpacer />

                <KpiNetworkQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  skip={isInitializing}
                  sourceId={sourceId}
                  startDate={from}
                >
                  {({ kpiNetwork, loading, id, inspect, refetch }) => (
                    <KpiNetworkComponentManage
                      id={id}
                      inspect={inspect}
                      setQuery={setQuery}
                      refetch={refetch}
                      data={kpiNetwork}
                      loading={loading}
                      from={from}
                      to={to}
                      narrowDateRange={narrowDateRange}
                    />
                  )}
                </KpiNetworkQuery>
              </Display>

              {capabilitiesFetched && !isInitializing ? (
                <>
                  <Display show={!globalFullScreen}>
                    <EuiSpacer />

                    <SiemNavigation navTabs={navTabsNetwork(hasMlUserPermissions)} />

                    <EuiSpacer />
                  </Display>

                  <NetworkRoutes
                    filterQuery={tabsFilterQuery}
                    from={from}
                    isInitializing={isInitializing}
                    indexPattern={indexPattern}
                    setQuery={setQuery}
                    setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
                    type={networkModel.NetworkType.page}
                    to={to}
                    networkPagePath={networkPagePath}
                  />
                </>
              ) : (
                <NetworkRoutesLoading />
              )}
            </WrapperPage>
          </>
        ) : (
          <WrapperPage>
            <HeaderPage border title={i18n.PAGE_TITLE} />
            <OverviewEmpty />
          </WrapperPage>
        )}

        <SpyRoute pageName={SecurityPageName.network} />
      </>
    );
  }
);
NetworkComponent.displayName = 'NetworkComponent';

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State) => {
    const timeline: TimelineModel =
      getTimeline(state, TimelineId.networkPageExternalAlerts) ?? timelineDefaults;
    const { graphEventId } = timeline;

    return {
      query: getGlobalQuerySelector(state),
      filters: getGlobalFiltersQuerySelector(state),
      graphEventId,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const Network = connector(NetworkComponent);
