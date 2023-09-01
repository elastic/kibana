/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { Redirect, useLocation } from 'react-router-dom';
import { DisabledCallout } from '../management/disabled_callout';
import { FilterGroup } from '../common/monitor_filters/filter_group';
import { OverviewAlerts } from './overview/overview_alerts';
import { useEnablement } from '../../../hooks';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import {
  fetchMonitorOverviewAction,
  quietFetchOverviewAction,
  selectOverviewState,
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
import { AlertingCallout } from '../../common/alerting_callout/alerting_callout';

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  useOverviewBreadcrumbs();

  const dispatch = useDispatch();

  const { lastRefresh } = useSyntheticsRefreshContext();
  const { search } = useLocation();

  const { loading: locationsLoading, locationsLoaded } = useSelector(selectServiceLocationsState);

  useEffect(() => {
    if (!locationsLoading && !locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded, locationsLoading]);

  const {
    enablement: { isEnabled },
    loading: enablementLoading,
  } = useEnablement();

  const {
    loaded: overviewLoaded,
    data: { monitors },
    pageState,
  } = useSelector(selectOverviewState);

  const {
    loading: monitorsLoading,
    loaded: monitorsLoaded,
    handleFilterChange,
    absoluteTotal,
  } = useMonitorList();

  // fetch overview for all other page state changes
  useEffect(() => {
    if (!overviewLoaded) {
      dispatch(fetchMonitorOverviewAction.get(pageState));
    }
    // change only needs to be triggered on pageState change
  }, [dispatch, pageState, overviewLoaded]);

  // fetch overview for refresh
  useEffect(() => {
    if (monitorsLoaded) {
      dispatch(quietFetchOverviewAction.get(pageState));
    }
    // for page state change we don't want quite fetch, see above fetch ^^
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, lastRefresh]);

  const hasNoMonitors = !search && !enablementLoading && monitorsLoaded && absoluteTotal === 0;

  if (hasNoMonitors && !monitorsLoading && isEnabled) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

  if (!isEnabled && hasNoMonitors) {
    return <Redirect to={MONITORS_ROUTE} />;
  }

  const noMonitorFound = monitorsLoaded && overviewLoaded && monitors?.length === 0;

  return (
    <>
      <DisabledCallout total={absoluteTotal} />
      <AlertingCallout />
      <EuiFlexGroup gutterSize="s" wrap={true}>
        <EuiFlexItem>
          <SearchField />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <QuickFilters />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FilterGroup handleFilterChange={handleFilterChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {!noMonitorFound ? (
        <>
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem grow={false}>
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
      ) : (
        <NoMonitorsFound />
      )}
    </>
  );
};
