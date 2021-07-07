/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { HostItem, LastEventIndexKey } from '../../../../common/search_strategy';
import { SecurityPageName } from '../../../app/types';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { LastEventTime } from '../../../common/components/last_event_time';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { hostToCriteria } from '../../../common/components/ml/criteria/host_to_criteria';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { SecuritySolutionTabNavigation } from '../../../common/components/navigation';
import { HostsDetailsKpiComponent } from '../../components/kpi_hosts';
import { HostOverview } from '../../../overview/components/host_overview';
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
import { ID, useUebaDetails } from '../../containers/hosts/details';
import { manageQuery } from '../../../common/components/page/manage_query';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';

const HostOverviewManage = manageQuery(HostOverview);

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

  const capabilities = useMlCapabilities();
  const kibana = useKibana();
  const uebaDetailsPageFilters: Filter[] = useMemo(() => getUebaDetailsPageFilters(detailName), [
    detailName,
  ]);
  const getFilters = () => [...uebaDetailsPageFilters, ...filters];

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
  const [loading, { uebaDetails: hostOverview, id, refetch }] = useUebaDetails({
    endDate: to,
    startDate: from,
    hostName: detailName,
    indexNames: selectedPatterns,
    skip: selectedPatterns.length === 0,
  });
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
                subtitle={
                  <LastEventTime
                    docValueFields={docValueFields}
                    indexKey={LastEventIndexKey.uebaDetails}
                    hostName={detailName}
                    indexNames={selectedPatterns}
                  />
                }
                title={detailName}
              />
              <SecuritySolutionTabNavigation
                navTabs={navTabsUebaDetails(detailName, hasMlUserPermissions(capabilities))}
              />

              <EuiSpacer />
            </Display>

            <UebaDetailsTabs
              docValueFields={docValueFields}
              indexNames={selectedPatterns}
              isInitializing={isInitializing}
              deleteQuery={deleteQuery}
              pageFilters={uebaDetailsPageFilters}
              to={to}
              from={from}
              detailName={detailName}
              type={type}
              setQuery={setQuery}
              filterQuery={filterQuery}
              uebaDetailsPagePath={uebaDetailsPagePath}
              indexPattern={indexPattern}
              setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
            />
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <SecuritySolutionPageWrapper>
          <HeaderPage border title={detailName} />

          <OverviewEmpty />
        </SecuritySolutionPageWrapper>
      )}

      <SpyRoute pageName={SecurityPageName.hosts} />
    </>
  );
};

UebaDetailsComponent.displayName = 'UebaDetailsComponent';

export const UebaDetails = React.memo(UebaDetailsComponent);
