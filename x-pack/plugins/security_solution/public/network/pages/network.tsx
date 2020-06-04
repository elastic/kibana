/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { useParams } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';

import { esQuery } from '../../../../../../src/plugins/data/public';
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
import {
  indicesExistOrDataTemporarilyUnavailable,
  WithSource,
} from '../../common/containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/keury';
import { State, inputsSelectors } from '../../common/store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../common/store/inputs/actions';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { networkModel } from '../store';
import { navTabsNetwork, NetworkRoutes, NetworkRoutesLoading } from './navigation';
import { filterNetworkData } from './navigation/alerts_query_tab_body';
import { NetworkEmptyPage } from './network_empty_page';
import * as i18n from './translations';
import { NetworkComponentProps } from './types';
import { NetworkRouteType } from './navigation/types';

const KpiNetworkComponentManage = manageQuery(KpiNetworkComponent);
const sourceId = 'default';

const NetworkComponent = React.memo<NetworkComponentProps & PropsFromRedux>(
  ({
    filters,
    query,
    setAbsoluteRangeDatePicker,
    networkPagePath,
    to,
    from,
    setQuery,
    isInitializing,
    hasMlUserPermissions,
    capabilitiesFetched,
  }) => {
    const kibana = useKibana();
    const { tabName } = useParams();

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
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );

    return (
      <>
        <WithSource sourceId={sourceId}>
          {({ indicesExist, indexPattern }) => {
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

            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar indexPattern={indexPattern} id="global" />
                </FiltersGlobal>

                <WrapperPage>
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

                  {capabilitiesFetched && !isInitializing ? (
                    <>
                      <EuiSpacer />

                      <SiemNavigation navTabs={navTabsNetwork(hasMlUserPermissions)} />

                      <EuiSpacer />

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

                  <EuiSpacer />
                </WrapperPage>
              </StickyContainer>
            ) : (
              <WrapperPage>
                <HeaderPage border title={i18n.PAGE_TITLE} />
                <NetworkEmptyPage />
              </WrapperPage>
            );
          }}
        </WithSource>

        <SpyRoute />
      </>
    );
  }
);
NetworkComponent.displayName = 'NetworkComponent';

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const mapStateToProps = (state: State) => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });
  return mapStateToProps;
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const Network = connector(NetworkComponent);
