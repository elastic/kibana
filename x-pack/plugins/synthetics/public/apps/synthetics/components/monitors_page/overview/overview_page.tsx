/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { Redirect } from 'react-router-dom';
import { useEnablement, useGetUrlParams } from '../../../hooks';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import {
  fetchMonitorOverviewAction,
  selectOverviewState,
  selectServiceLocationsState,
} from '../../../state';
import { getServiceLocations } from '../../../state/service_locations';

import { GETTING_STARTED_ROUTE, MONITORS_ROUTE } from '../../../../../../common/constants';

import { useMonitorList } from '../hooks/use_monitor_list';
import { useOverviewBreadcrumbs } from './use_breadcrumbs';
import { OverviewGrid } from './overview/overview_grid';
import { OverviewStatus } from './overview/overview_status';
import { SearchField } from '../common/search_field';

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  useOverviewBreadcrumbs();

  const dispatch = useDispatch();

  const { refreshApp } = useSyntheticsRefreshContext();
  const { query = '' } = useGetUrlParams();

  const { pageState } = useSelector(selectOverviewState);
  const { loading: locationsLoading, locationsLoaded } = useSelector(selectServiceLocationsState);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshApp();
    }, 1000 * 30);
    return () => clearInterval(interval);
  }, [refreshApp]);

  useEffect(() => {
    if (!locationsLoading && !locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded, locationsLoading]);

  // fetch overview for query changes
  useEffect(() => {
    if (!isEqual(pageState, { ...pageState, query })) {
      dispatch(fetchMonitorOverviewAction.get({ ...pageState, query }));
    }
  }, [dispatch, pageState, query]);

  // fetch overview for all other page state changes
  useEffect(() => {
    dispatch(fetchMonitorOverviewAction.get(pageState));
  }, [dispatch, pageState]);

  const {
    enablement: { isEnabled },
    loading: enablementLoading,
  } = useEnablement();

  const { syntheticsMonitors, loading: monitorsLoading, loaded: monitorsLoaded } = useMonitorList();

  if (!enablementLoading && isEnabled && !monitorsLoading && syntheticsMonitors.length === 0) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

  if (!enablementLoading && !isEnabled && monitorsLoaded && syntheticsMonitors.length === 0) {
    return <Redirect to={MONITORS_ROUTE} />;
  }

  return (
    <>
      <SearchField />
      <EuiSpacer />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <OverviewStatus />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <OverviewGrid />
    </>
  );
};
