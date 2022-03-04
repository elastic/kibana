/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import type { Filter } from '@kbn/es-query';
import { SecurityPageName } from '../../../app/types';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionTabNavigation } from '../../../common/components/navigation';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { inputsSelectors } from '../../../common/store';
import { setUsersDetailsTablesActivePageToZero } from '../../store/actions';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { getEsQueryConfig } from '../../../../../../../src/plugins/data/common';

import { OverviewEmpty } from '../../../overview/components/overview_empty';
import { UsersDetailsTabs } from './details_tabs';
import { navTabsUsersDetails } from './nav_tabs';
import { UsersDetailsProps } from './types';
import { type } from './utils';
import { getUsersDetailsPageFilters } from './helpers';
import { showGlobalFilters } from '../../../timelines/components/timeline/helpers';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { LastEventTime } from '../../../common/components/last_event_time';
import { LastEventIndexKey } from '../../../../common/search_strategy';
const ID = 'UsersDetailsQueryId';

const UsersDetailsComponent: React.FC<UsersDetailsProps> = ({
  detailName,
  usersDetailsPagePath,
}) => {
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

  const kibana = useKibana();
  const usersDetailsPageFilters: Filter[] = useMemo(
    () => getUsersDetailsPageFilters(detailName),
    [detailName]
  );
  const getFilters = () => [...usersDetailsPageFilters, ...filters];

  const { docValueFields, indicesExist, indexPattern, selectedPatterns } = useSourcererDataView();

  const [filterQuery, kqlError] = convertToBuildEsQuery({
    config: getEsQueryConfig(kibana.services.uiSettings),
    indexPattern,
    queries: [query],
    filters: getFilters(),
  });

  useInvalidFilterQuery({ id: ID, filterQuery, kqlError, query, startDate: from, endDate: to });

  useEffect(() => {
    dispatch(setUsersDetailsTablesActivePageToZero());
  }, [dispatch, detailName]);

  return (
    <>
      {indicesExist ? (
        <>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar indexPattern={indexPattern} id="global" />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
            <HeaderPage
              border
              subtitle={
                <LastEventTime
                  docValueFields={docValueFields}
                  indexKey={LastEventIndexKey.userDetails}
                  indexNames={selectedPatterns}
                  userName={detailName}
                />
              }
              title={detailName}
            />
            <EuiSpacer />

            <SecuritySolutionTabNavigation navTabs={navTabsUsersDetails(detailName)} />

            <EuiSpacer />
            <UsersDetailsTabs
              deleteQuery={deleteQuery}
              detailName={detailName}
              docValueFields={docValueFields}
              filterQuery={filterQuery}
              from={from}
              indexNames={selectedPatterns}
              indexPattern={indexPattern}
              isInitializing={isInitializing}
              pageFilters={usersDetailsPageFilters}
              setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
              setQuery={setQuery}
              to={to}
              type={type}
              usersDetailsPagePath={usersDetailsPagePath}
            />
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <SecuritySolutionPageWrapper>
          <HeaderPage border title={detailName} />

          <OverviewEmpty />
        </SecuritySolutionPageWrapper>
      )}

      <SpyRoute pageName={SecurityPageName.users} />
    </>
  );
};

UsersDetailsComponent.displayName = 'UsersDetailsComponent';

export const UsersDetails = React.memo(UsersDetailsComponent);
