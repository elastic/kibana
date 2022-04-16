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
import { Filter } from '@kbn/es-query';
import { isTab } from '@kbn/timelines-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { SecurityPageName } from '../../app/types';
import { FiltersGlobal } from '../../common/components/filters_global';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionTabNavigation } from '../../common/components/navigation';

import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { LastEventTime } from '../../common/components/last_event_time';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/keury';
import { inputsSelectors, State } from '../../common/store';
import { setAbsoluteRangeDatePicker } from '../../common/store/inputs/actions';

import { SpyRoute } from '../../common/utils/route/spy_routes';
import { UsersTabs } from './users_tabs';
import { navTabsUsers } from './nav_tabs';
import * as i18n from './translations';
import { usersModel, usersSelectors } from '../store';
import {
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
} from '../../timelines/components/timeline/helpers';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../common/hooks/use_invalid_filter_query';
import { UsersKpiComponent } from '../components/kpi_users';
import { UpdateDateRange } from '../../common/components/charts/common';
import { LastEventIndexKey } from '../../../common/search_strategy';
import { generateSeverityFilter } from '../../hosts/store/helpers';
import { UsersTableType } from '../store/model';
import { hasMlUserPermissions } from '../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../common/components/ml/hooks/use_ml_capabilities';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { LandingPageComponent } from '../../common/components/landing_page';
import { userNameExistsFilter } from './details/helpers';

const ID = 'UsersQueryId';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const UsersComponent = () => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const getUsersRiskScoreFilterQuerySelector = useMemo(
    () => usersSelectors.usersRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelection = useDeepEqualSelector((state: State) =>
    getUsersRiskScoreFilterQuerySelector(state)
  );

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const { uiSettings } = useKibana().services;

  const { tabName } = useParams<{ tabName: string }>();
  const tabsFilters: Filter[] = React.useMemo(() => {
    if (tabName === UsersTableType.alerts || tabName === UsersTableType.events) {
      return filters.length > 0 ? [...filters, ...userNameExistsFilter] : userNameExistsFilter;
    }

    if (tabName === UsersTableType.risk) {
      const severityFilter = generateSeverityFilter(severitySelection);

      return [...severityFilter, ...filters];
    }
    return filters;
  }, [severitySelection, tabName, filters]);

  const { docValueFields, indicesExist, indexPattern, selectedPatterns } = useSourcererDataView();
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

  const capabilities = useMlCapabilities();
  const riskyUsersFeatureEnabled = useIsExperimentalFeatureEnabled('riskyUsersEnabled');
  const navTabs = useMemo(
    () => navTabsUsers(hasMlUserPermissions(capabilities), riskyUsersFeatureEnabled),
    [capabilities, riskyUsersFeatureEnabled]
  );

  return (
    <>
      {indicesExist ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal>
            <SiemSearchBar indexPattern={indexPattern} id="global" />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
            <HeaderPage
              subtitle={
                <LastEventTime
                  docValueFields={docValueFields}
                  indexKey={LastEventIndexKey.users}
                  indexNames={selectedPatterns}
                />
              }
              border
              title={i18n.PAGE_TITLE}
            />

            <UsersKpiComponent
              filterQuery={filterQuery}
              indexNames={selectedPatterns}
              from={from}
              setQuery={setQuery}
              to={to}
              skip={isInitializing || !filterQuery}
              narrowDateRange={narrowDateRange}
            />

            <EuiSpacer />

            <SecuritySolutionTabNavigation navTabs={navTabs} />

            <EuiSpacer />

            <UsersTabs
              deleteQuery={deleteQuery}
              docValueFields={docValueFields}
              filterQuery={tabsFilterQuery || ''}
              from={from}
              indexNames={selectedPatterns}
              isInitializing={isInitializing}
              setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
              setQuery={setQuery}
              to={to}
              type={usersModel.UsersType.page}
              pageFilters={tabsFilters}
            />
          </SecuritySolutionPageWrapper>
        </StyledFullHeightContainer>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.users} />
    </>
  );
};
UsersComponent.displayName = 'UsersComponent';

export const Users = React.memo(UsersComponent);
