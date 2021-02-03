/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import styled from 'styled-components';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { SecurityPageName } from '../../app/types';
import { UpdateDateRange } from '../../common/components/charts/common';
import { FiltersGlobal } from '../../common/components/filters_global';
import { HeaderPage } from '../../common/components/header_page';
import { LastEventTime } from '../../common/components/last_event_time';
import { hasMlUserPermissions } from '../../../common/machine_learning/has_ml_user_permissions';
import { SiemNavigation } from '../../common/components/navigation';
import { HostsKpiComponent } from '../components/kpi_hosts';
import { SiemSearchBar } from '../../common/components/search_bar';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { TimelineId } from '../../../common/types/timeline';
import { LastEventIndexKey } from '../../../common/search_strategy';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/keury';
import { inputsSelectors } from '../../common/store';
import { setAbsoluteRangeDatePicker } from '../../common/store/inputs/actions';

import { SpyRoute } from '../../common/utils/route/spy_routes';
import { esQuery } from '../../../../../../src/plugins/data/public';
import { useMlCapabilities } from '../../common/components/ml/hooks/use_ml_capabilities';
import { OverviewEmpty } from '../../overview/components/overview_empty';
import { Display } from './display';
import { HostsTabs } from './hosts_tabs';
import { navTabsHosts } from './nav_tabs';
import * as i18n from './translations';
import { filterHostData } from './navigation';
import { hostsModel } from '../store';
import { HostsTableType } from '../store/model';
import { isTab } from '../../common/components/accessibility/helpers';
import {
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../timelines/components/timeline/helpers';
import { timelineSelectors } from '../../timelines/store/timeline';
import { timelineDefaults } from '../../timelines/store/timeline/defaults';
import { useSourcererScope } from '../../common/containers/sourcerer';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../common/hooks/use_selector';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const HostsComponent = () => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) =>
      (
        getTimeline(state, TimelineId.hostsPageEvents) ??
        getTimeline(state, TimelineId.hostsPageExternalAlerts) ??
        timelineDefaults
      ).graphEventId
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
  const { uiSettings } = useKibana().services;
  const { tabName } = useParams<{ tabName: string }>();
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
  const filterQuery = useMemo(
    () =>
      convertToBuildEsQuery({
        config: esQuery.getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters,
      }),
    [filters, indexPattern, uiSettings, query]
  );
  const tabsFilterQuery = useMemo(
    () =>
      convertToBuildEsQuery({
        config: esQuery.getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters: tabsFilters,
      }),
    [indexPattern, query, tabsFilters, uiSettings]
  );

  const onSkipFocusBeforeEventsTable = useCallback(() => {
    containerElement.current
      ?.querySelector<HTMLButtonElement>('.inspectButtonComponent:last-of-type')
      ?.focus();
  }, [containerElement]);

  const onSkipFocusAfterEventsTable = useCallback(() => {
    resetKeyboardFocus();
  }, []);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (isTab(keyboardEvent)) {
        onTimelineTabKeyPressed({
          containerElement: containerElement.current,
          keyboardEvent,
          onSkipFocusBeforeEventsTable,
          onSkipFocusAfterEventsTable,
        });
      }
    },
    [containerElement, onSkipFocusBeforeEventsTable, onSkipFocusAfterEventsTable]
  );

  return (
    <>
      {indicesExist ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
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
                    indexKey={LastEventIndexKey.hosts}
                    indexNames={selectedPatterns}
                  />
                }
                title={i18n.PAGE_TITLE}
              />

              <HostsKpiComponent
                filterQuery={filterQuery}
                indexNames={selectedPatterns}
                from={from}
                setQuery={setQuery}
                to={to}
                skip={isInitializing}
                narrowDateRange={narrowDateRange}
              />

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
              indexNames={selectedPatterns}
              setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
              setQuery={setQuery}
              from={from}
              type={hostsModel.HostsType.page}
            />
          </WrapperPage>
        </StyledFullHeightContainer>
      ) : (
        <WrapperPage>
          <HeaderPage border title={i18n.PAGE_TITLE} />

          <OverviewEmpty />
        </WrapperPage>
      )}

      <SpyRoute pageName={SecurityPageName.hosts} />
    </>
  );
};
HostsComponent.displayName = 'HostsComponent';

export const Hosts = React.memo(HostsComponent);
