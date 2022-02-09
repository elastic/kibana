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
import { isTab } from '../../../../timelines/public';

import { SecurityPageName } from '../../app/types';
import { FiltersGlobal } from '../../common/components/filters_global';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionTabNavigation } from '../../common/components/navigation';

import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useKibana } from '../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../common/lib/keury';
import { inputsSelectors } from '../../common/store';
import { setAbsoluteRangeDatePicker } from '../../common/store/inputs/actions';

import { SpyRoute } from '../../common/utils/route/spy_routes';
import { getEsQueryConfig } from '../../../../../../src/plugins/data/common';
import { OverviewEmpty } from '../../overview/components/overview_empty';
import { UsersTabs } from './users_tabs';
import { navTabsUsers } from './nav_tabs';
import * as i18n from './translations';
import { usersModel } from '../store';
import {
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
} from '../../timelines/components/timeline/helpers';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../common/hooks/use_invalid_filter_query';
import { UsersDetailsLink } from '../../common/components/links';

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
  const containerElement = useRef<HTMLDivElement | null>(null);

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const { uiSettings } = useKibana().services;
  const tabsFilters = filters;

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

  return (
    <>
      {indicesExist ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal>
            <SiemSearchBar indexPattern={indexPattern} id="global" />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
            <HeaderPage subtitle={'TODO <LastEventTime />'} title={i18n.PAGE_TITLE} />

            <SecuritySolutionTabNavigation navTabs={navTabsUsers} />

            <EuiSpacer />

            <UsersDetailsLink userName="TODO user details" />

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
            />
          </SecuritySolutionPageWrapper>
        </StyledFullHeightContainer>
      ) : (
        <SecuritySolutionPageWrapper>
          <HeaderPage border title={i18n.PAGE_TITLE} />

          <OverviewEmpty />
        </SecuritySolutionPageWrapper>
      )}

      <SpyRoute pageName={SecurityPageName.users} />
    </>
  );
};
UsersComponent.displayName = 'UsersComponent';

export const Users = React.memo(UsersComponent);
