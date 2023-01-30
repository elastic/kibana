/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { Redirect, useLocation } from 'react-router-dom';
import { OverviewAlerts } from './overview/overview_alerts';
import { useEnablement, useGetUrlParams } from '../../../hooks';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import {
  fetchMonitorOverviewAction,
  quietFetchOverviewAction,
  setOverviewPageStateAction,
  selectOverviewPageState,
  selectServiceLocationsState,
} from '../../../state';
import { getServiceLocations } from '../../../state/service_locations';

import { GETTING_STARTED_ROUTE, MONITORS_ROUTE } from '../../../../../../common/constants';

import { useMonitorList } from '../hooks/use_monitor_list';
import { useOverviewBreadcrumbs } from './use_breadcrumbs';
import { OverviewGrid } from './overview/overview_grid';
import { OverviewStatus } from './overview/overview_status';
import { QuickFilters } from './overview/quick_filters';
import { SearchField } from '../common/search_field';
import { NoMonitorsFound } from '../common/no_monitors_found';
import { OverviewErrors } from './overview/overview_errors/overview_errors';

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  useOverviewBreadcrumbs();

  const dispatch = useDispatch();

  const { lastRefresh } = useSyntheticsRefreshContext();
  const { query } = useGetUrlParams();
  const { search } = useLocation();

  const pageState = useSelector(selectOverviewPageState);
  const { loading: locationsLoading, locationsLoaded } = useSelector(selectServiceLocationsState);

  useEffect(() => {
    if (!locationsLoading && !locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded, locationsLoading]);

  // fetch overview for query state changes
  useEffect(() => {
    if (pageState.query !== query) {
      dispatch(fetchMonitorOverviewAction.get({ ...pageState, query }));
      dispatch(setOverviewPageStateAction({ query }));
    }
  }, [dispatch, pageState, query]);

  // fetch overview for all other page state changes
  useEffect(() => {
    dispatch(fetchMonitorOverviewAction.get(pageState));
  }, [dispatch, pageState]);

  // fetch overview for refresh
  useEffect(() => {
    dispatch(quietFetchOverviewAction.get(pageState));
  }, [dispatch, pageState, lastRefresh]);

  const {
    enablement: { isEnabled },
    loading: enablementLoading,
  } = useEnablement();

  const { syntheticsMonitors, loading: monitorsLoading, loaded: monitorsLoaded } = useMonitorList();

  if (
    !search &&
    !enablementLoading &&
    isEnabled &&
    !monitorsLoading &&
    syntheticsMonitors.length === 0
  ) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

  if (
    !search &&
    !enablementLoading &&
    !isEnabled &&
    monitorsLoaded &&
    syntheticsMonitors.length === 0
  ) {
    return <Redirect to={MONITORS_ROUTE} />;
  }

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <SearchField />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <QuickFilters />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {Boolean(!monitorsLoaded || syntheticsMonitors?.length > 0) && (
        <>
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem grow={2}>
              <OverviewStatus />
            </EuiFlexItem>
            <EuiFlexItem grow={3} style={{ minWidth: 300 }}>
              <OverviewErrors />
            </EuiFlexItem>
            <EuiFlexItem grow={3} style={{ minWidth: 300 }}>
              <OverviewAlerts />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <OverviewGrid />
        </>
      )}
      {monitorsLoaded && syntheticsMonitors?.length === 0 && <NoMonitorsFound />}
    </>
  );
};
