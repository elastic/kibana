/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import styled from 'styled-components';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { isTab } from '../../../../timelines/public';

import { SecurityPageName } from '../../app/types';
import { UpdateDateRange } from '../../common/components/charts/common';
import { FiltersGlobal } from '../../common/components/filters_global';
import { HeaderPage } from '../../common/components/header_page';
import { LastEventTime } from '../../common/components/last_event_time';
import { hasMlUserPermissions } from '../../../common/machine_learning/has_ml_user_permissions';
import { SecuritySolutionTabNavigation } from '../../common/components/navigation';
import { HostsKpiComponent } from '../components/kpi_hosts';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { TimelineId } from '../../../common/types/timeline';
import { LastEventIndexKey } from '../../../common/search_strategy';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/keury';
import { inputsSelectors, State } from '../../common/store';
import { setAbsoluteRangeDatePicker } from '../../common/store/inputs/actions';

import { SpyRoute } from '../../common/utils/route/spy_routes';
import { getEsQueryConfig } from '../../../../../../src/plugins/data/common';
import { useMlCapabilities } from '../../common/components/ml/hooks/use_ml_capabilities';
import { Display } from './display';
import { HostsTabs } from './hosts_tabs';
import { navTabsHosts } from './nav_tabs';
import * as i18n from './translations';
import { hostsModel, hostsSelectors } from '../store';
import { generateSeverityFilter } from '../store/helpers';
import { HostsTableType } from '../store/model';
import {
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../timelines/components/timeline/helpers';
import { timelineSelectors } from '../../timelines/store/timeline';
import { timelineDefaults } from '../../timelines/store/timeline/defaults';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../common/hooks/use_invalid_filter_query';
import { ID } from '../containers/hosts';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { filterHostExternalAlertData } from '../../common/components/visualization_actions/utils';
import { LandingPageComponent } from '../../common/components/landing_page';
import { Loader } from '../../common/components/loader';

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
  const getHostRiskScoreFilterQuerySelector = useMemo(
    () => hostsSelectors.hostRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelection = useDeepEqualSelector((state: State) =>
    getHostRiskScoreFilterQuerySelector(state, hostsModel.HostsType.page)
  );

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const capabilities = useMlCapabilities();
  const { uiSettings } = useKibana().services;
  const { tabName } = useParams<{ tabName: string }>();
  const tabsFilters = React.useMemo(() => {
    if (tabName === HostsTableType.alerts) {
      return filters.length > 0
        ? [...filters, ...filterHostExternalAlertData]
        : filterHostExternalAlertData;
    }

    if (tabName === HostsTableType.risk) {
      const severityFilter = generateSeverityFilter(severitySelection);

      return [...severityFilter, ...filterHostExternalAlertData, ...filters];
    }
    return filters;
  }, [severitySelection, tabName, filters]);
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
  const { docValueFields, indicesExist, indexPattern, selectedPatterns, loading } =
    useSourcererDataView();
  const [filterQuery, kqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters,
      }),
    [filters, indexPattern, uiSettings, query]
  );
  const [tabsFilterQuery] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters: tabsFilters,
      }),
    [indexPattern, query, tabsFilters, uiSettings]
  );

  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');
  const usersEnabled = useIsExperimentalFeatureEnabled('usersEnabled');

  useInvalidFilterQuery({ id: ID, filterQuery, kqlError, query, startDate: from, endDate: to });

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

  if (loading) {
    return <Loader data-test-subj="loadingPanelExploreHosts" overlay size="xl" />;
  }

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
                    indexKey={LastEventIndexKey.hosts}
                    indexNames={selectedPatterns}
                  />
                }
                title={i18n.PAGE_TITLE}
                border
              />

              <HostsKpiComponent
                filterQuery={filterQuery}
                indexNames={selectedPatterns}
                from={from}
                setQuery={setQuery}
                to={to}
                skip={isInitializing || !filterQuery}
                narrowDateRange={narrowDateRange}
              />

              <EuiSpacer />

              <SecuritySolutionTabNavigation
                navTabs={navTabsHosts({
                  hasMlUserPermissions: hasMlUserPermissions(capabilities),
                  isRiskyHostsEnabled: riskyHostsFeatureEnabled,
                  isUsersEnabled: usersEnabled,
                })}
              />

              <EuiSpacer />
            </Display>

            <HostsTabs
              deleteQuery={deleteQuery}
              docValueFields={docValueFields}
              to={to}
              filterQuery={tabsFilterQuery || ''}
              isInitializing={isInitializing}
              indexNames={selectedPatterns}
              setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
              setQuery={setQuery}
              from={from}
              type={hostsModel.HostsType.page}
            />
          </SecuritySolutionPageWrapper>
        </StyledFullHeightContainer>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.hosts} />
    </>
  );
};
HostsComponent.displayName = 'HostsComponent';

export const Hosts = React.memo(HostsComponent);
