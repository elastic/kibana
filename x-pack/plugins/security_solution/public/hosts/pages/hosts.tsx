/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { useParams } from 'react-router-dom';

import { SecurityPageName } from '../../app/types';
import { UpdateDateRange } from '../../common/components/charts/common';
import { FiltersGlobal } from '../../common/components/filters_global';
import { HeaderPage } from '../../common/components/header_page';
import { LastEventTime } from '../../common/components/last_event_time';
import { hasMlUserPermissions } from '../../../common/machine_learning/has_ml_user_permissions';
import { SiemNavigation } from '../../common/components/navigation';
import { KpiHostsComponent } from '../components/kpi_hosts';
import { manageQuery } from '../../common/components/page/manage_query';
import { SiemSearchBar } from '../../common/components/search_bar';
import { WrapperPage } from '../../common/components/wrapper_page';
import { KpiHostsQuery } from '../containers/kpi_hosts';
import { useFullScreen } from '../../common/containers/use_full_screen';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useWithSource } from '../../common/containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/keury';
import { inputsSelectors, State } from '../../common/store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../common/store/inputs/actions';

import { SpyRoute } from '../../common/utils/route/spy_routes';
import { esQuery } from '../../../../../../src/plugins/data/public';
import { useMlCapabilities } from '../../common/components/ml_popover/hooks/use_ml_capabilities';
import { OverviewEmpty } from '../../overview/components/overview_empty';
import { Display } from './display';
import { HostsTabs } from './hosts_tabs';
import { navTabsHosts } from './nav_tabs';
import * as i18n from './translations';
import { HostsComponentProps } from './types';
import { filterHostData } from './navigation';
import { hostsModel } from '../store';
import { HostsTableType } from '../store/model';

const KpiHostsComponentManage = manageQuery(KpiHostsComponent);

export const HostsComponent = React.memo<HostsComponentProps & PropsFromRedux>(
  ({ filters, query, setAbsoluteRangeDatePicker, hostsPagePath }) => {
    const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
    const { globalFullScreen } = useFullScreen();
    const capabilities = useMlCapabilities();
    const kibana = useKibana();
    const { tabName } = useParams();
    const tabsFilters = React.useMemo(() => {
      if (tabName === HostsTableType.alerts) {
        return filters.length > 0 ? [...filters, ...filterHostData] : filterHostData;
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
    const { docValueFields, indicesExist, indexPattern } = useWithSource();
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
          <StickyContainer>
            <EuiWindowEvent event="resize" handler={noop} />
            <FiltersGlobal>
              <SiemSearchBar indexPattern={indexPattern} id="global" />
            </FiltersGlobal>

            <WrapperPage noPadding={globalFullScreen}>
              <Display show={!globalFullScreen}>
                <HeaderPage
                  border
                  subtitle={<LastEventTime indexKey={LastEventIndexKey.hosts} />}
                  title={i18n.PAGE_TITLE}
                />

                <KpiHostsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  skip={isInitializing}
                  sourceId="default"
                  startDate={from}
                >
                  {({ kpiHosts, loading, id, inspect, refetch }) => (
                    <KpiHostsComponentManage
                      data={kpiHosts}
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
                </KpiHostsQuery>

                <EuiSpacer />

                <SiemNavigation navTabs={navTabsHosts(hasMlUserPermissions(capabilities))} />

                <EuiSpacer />
              </Display>

              <HostsTabs
                deleteQuery={deleteQuery}
                docValueFields={docValueFields}
                to={to}
                filterQuery={tabsFilterQuery}
                isInitializing={isInitializing}
                setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
                setQuery={setQuery}
                from={from}
                type={hostsModel.HostsType.page}
                indexPattern={indexPattern}
                hostsPagePath={hostsPagePath}
              />
            </WrapperPage>
          </StickyContainer>
        ) : (
          <WrapperPage>
            <HeaderPage border title={i18n.PAGE_TITLE} />

            <OverviewEmpty />
          </WrapperPage>
        )}

        <SpyRoute pageName={SecurityPageName.hosts} />
      </>
    );
  }
);
HostsComponent.displayName = 'HostsComponent';

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

export const Hosts = connector(HostsComponent);
