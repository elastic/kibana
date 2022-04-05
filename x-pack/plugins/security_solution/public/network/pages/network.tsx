/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

import { isTab } from '../../../../timelines/public';
import { getEsQueryConfig } from '../../../../../../src/plugins/data/common';
import { SecurityPageName } from '../../app/types';
import { UpdateDateRange } from '../../common/components/charts/common';
import { EmbeddedMap } from '../components/embeddables/embedded_map';
import { FiltersGlobal } from '../../common/components/filters_global';
import { HeaderPage } from '../../common/components/header_page';
import { LastEventTime } from '../../common/components/last_event_time';
import { SecuritySolutionTabNavigation } from '../../common/components/navigation';

import { NetworkKpiComponent } from '../components/kpi_network';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { LastEventIndexKey } from '../../../common/search_strategy';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/keury';
import { inputsSelectors } from '../../common/store';
import { setAbsoluteRangeDatePicker } from '../../common/store/inputs/actions';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { Display } from '../../hosts/pages/display';
import { networkModel } from '../store';
import { navTabsNetwork, NetworkRoutes, NetworkRoutesLoading } from './navigation';
import * as i18n from './translations';
import { NetworkComponentProps } from './types';
import { NetworkRouteType } from './navigation/types';
import {
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../timelines/components/timeline/helpers';
import { timelineSelectors } from '../../timelines/store/timeline';
import { TimelineId } from '../../../common/types/timeline';
import { timelineDefaults } from '../../timelines/store/timeline/defaults';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../common/hooks/use_invalid_filter_query';
import { filterNetworkExternalAlertData } from '../../common/components/visualization_actions/utils';
import { LandingPageComponent } from '../../common/components/landing_page';
/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const ID = 'NetworkQueryId';

const NetworkComponent = React.memo<NetworkComponentProps>(
  ({ hasMlUserPermissions, capabilitiesFetched }) => {
    const dispatch = useDispatch();
    const containerElement = useRef<HTMLDivElement | null>(null);
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const graphEventId = useShallowEqualSelector(
      (state) =>
        (getTimeline(state, TimelineId.networkPageExternalAlerts) ?? timelineDefaults).graphEventId
    );
    const getGlobalFiltersQuerySelector = useMemo(
      () => inputsSelectors.globalFiltersQuerySelector(),
      []
    );
    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
    const query = useDeepEqualSelector(getGlobalQuerySelector);
    const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

    const { to, from, setQuery, isInitializing } = useGlobalTime();
    const { globalFullScreen } = useGlobalFullScreen();
    const kibana = useKibana();
    const { tabName } = useParams<{ tabName: string }>();

    const canUseMaps = kibana.services.application.capabilities.maps.show;

    const tabsFilters = useMemo(() => {
      if (tabName === NetworkRouteType.alerts) {
        return filters.length > 0
          ? [...filters, ...filterNetworkExternalAlertData]
          : filterNetworkExternalAlertData;
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

    const { docValueFields, indicesExist, indexPattern, selectedPatterns } = useSourcererDataView();

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

    const [filterQuery, kqlError] = convertToBuildEsQuery({
      config: getEsQueryConfig(kibana.services.uiSettings),
      indexPattern,
      queries: [query],
      filters,
    });
    const [tabsFilterQuery] = convertToBuildEsQuery({
      config: getEsQueryConfig(kibana.services.uiSettings),
      indexPattern,
      queries: [query],
      filters: tabsFilters,
    });

    useInvalidFilterQuery({ id: ID, filterQuery, kqlError, query, startDate: from, endDate: to });

    return (
      <>
        {indicesExist ? (
          <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
            <EuiWindowEvent event="resize" handler={noop} />
            <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
              <SiemSearchBar indexPattern={indexPattern} id="global" />
            </FiltersGlobal>

            <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
              <Display show={!globalFullScreen}>
                <HeaderPage
                  subtitle={
                    <LastEventTime
                      docValueFields={docValueFields}
                      indexKey={LastEventIndexKey.network}
                      indexNames={selectedPatterns}
                    />
                  }
                  title={i18n.PAGE_TITLE}
                  border
                />

                {canUseMaps && (
                  <>
                    <EuiPanel
                      hasBorder
                      paddingSize="none"
                      data-test-subj="conditional-embeddable-map"
                    >
                      <EmbeddedMap
                        query={query}
                        filters={filters}
                        startDate={from}
                        endDate={to}
                        setQuery={setQuery}
                      />
                    </EuiPanel>
                    <EuiSpacer />
                  </>
                )}

                <NetworkKpiComponent
                  filterQuery={filterQuery}
                  from={from}
                  indexNames={selectedPatterns}
                  narrowDateRange={narrowDateRange}
                  setQuery={setQuery}
                  skip={isInitializing || filterQuery === undefined}
                  to={to}
                />
              </Display>

              {capabilitiesFetched && !isInitializing ? (
                <>
                  <Display show={!globalFullScreen}>
                    <EuiSpacer />
                    <SecuritySolutionTabNavigation navTabs={navTabsNetwork(hasMlUserPermissions)} />
                    <EuiSpacer />
                  </Display>

                  <NetworkRoutes
                    docValueFields={docValueFields}
                    filterQuery={tabsFilterQuery}
                    from={from}
                    isInitializing={isInitializing}
                    indexPattern={indexPattern}
                    indexNames={selectedPatterns}
                    setQuery={setQuery}
                    setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
                    type={networkModel.NetworkType.page}
                    to={to}
                  />
                </>
              ) : (
                <NetworkRoutesLoading />
              )}
            </SecuritySolutionPageWrapper>
          </StyledFullHeightContainer>
        ) : (
          <LandingPageComponent />
        )}

        <SpyRoute pageName={SecurityPageName.network} />
      </>
    );
  }
);
NetworkComponent.displayName = 'NetworkComponent';

export const Network = React.memo(NetworkComponent);
