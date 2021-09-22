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

import { LastEventIndexKey } from '../../../../common/search_strategy';
import { SecurityPageName } from '../../../app/types';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { LastEventTime } from '../../../common/components/last_event_time';
import { SecuritySolutionTabNavigation } from '../../../common/components/navigation';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { inputsSelectors } from '../../../common/store';
import { setUebaDetailsTablesActivePageToZero } from '../../store/actions';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { esQuery, Filter } from '../../../../../../../src/plugins/data/public';

import { OverviewEmpty } from '../../../overview/components/overview_empty';
import { UebaDetailsTabs } from './details_tabs';
import { navTabsUebaDetails } from './nav_tabs';
import { UebaDetailsProps } from './types';
import { type } from './utils';
import { getUebaDetailsPageFilters } from './helpers';
import { showGlobalFilters } from '../../../timelines/components/timeline/helpers';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../display';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
const ID = 'UebaDetailsQueryId';

const UebaDetailsComponent: React.FC<UebaDetailsProps> = ({ detailName, uebaDetailsPagePath }) => {
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
  const uebaDetailsPageFilters: Filter[] = useMemo(
    () => getUebaDetailsPageFilters(detailName),
    [detailName]
  );
  const getFilters = () => [...uebaDetailsPageFilters, ...filters];

  const { docValueFields, indicesExist, indexPattern, selectedPatterns } = useSourcererScope(
    SourcererScopeName.detections
  );

  const [filterQuery, kqlError] = convertToBuildEsQuery({
    config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
    indexPattern,
    queries: [query],
    filters: getFilters(),
  });

  useInvalidFilterQuery({ id: ID, filterQuery, kqlError, query, startDate: from, endDate: to });

  useEffect(() => {
    dispatch(setUebaDetailsTablesActivePageToZero());
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
            <Display show={!globalFullScreen}>
              <HeaderPage
                border
                sourcererScope={SourcererScopeName.detections}
                subtitle={
                  <LastEventTime
                    docValueFields={docValueFields}
                    indexKey={LastEventIndexKey.ueba}
                    hostName={detailName}
                    indexNames={selectedPatterns}
                  />
                }
                title={detailName}
              />
              <SecuritySolutionTabNavigation navTabs={navTabsUebaDetails(detailName)} />

              <EuiSpacer />
            </Display>

            <UebaDetailsTabs
              deleteQuery={deleteQuery}
              detailName={detailName}
              docValueFields={docValueFields}
              filterQuery={filterQuery}
              from={from}
              indexNames={selectedPatterns}
              indexPattern={indexPattern}
              isInitializing={isInitializing}
              pageFilters={uebaDetailsPageFilters}
              setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
              setQuery={setQuery}
              to={to}
              type={type}
              uebaDetailsPagePath={uebaDetailsPagePath}
            />
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <SecuritySolutionPageWrapper>
          <HeaderPage border title={detailName} />

          <OverviewEmpty />
        </SecuritySolutionPageWrapper>
      )}

      <SpyRoute pageName={SecurityPageName.ueba} />
    </>
  );
};

UebaDetailsComponent.displayName = 'UebaDetailsComponent';

export const UebaDetails = React.memo(UebaDetailsComponent);
