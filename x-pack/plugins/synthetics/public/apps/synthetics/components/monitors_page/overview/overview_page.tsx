/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { Redirect } from 'react-router-dom';
import { useEnablement } from '../../../hooks';
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

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  useOverviewBreadcrumbs();

  const dispatch = useDispatch();

  const { refreshApp } = useSyntheticsRefreshContext();

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

  return <OverviewGrid />;
};
