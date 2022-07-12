/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiLoadingElastic, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { Redirect } from 'react-router-dom';
import { useEnablement } from '../../../hooks';
import {
  fetchMonitorOverviewAction,
  selectOverviewState,
  selectServiceLocationsState,
} from '../../../state';
import { getServiceLocations } from '../../../state/service_locations';

import { GETTING_STARTED_ROUTE } from '../../../../../../common/constants';

import { useMonitorList } from '../hooks/use_monitor_list';
import { useOverviewBreadcrumbs } from './use_breadcrumbs';
import { OverviewGrid } from './overview/overview_grid';

export const OverviewPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'overview' });
  useTrackPageview({ app: 'synthetics', path: 'overview', delay: 15000 });
  const dispatch = useDispatch();
  useOverviewBreadcrumbs();
  const { loaded, loading, pageState } = useSelector(selectOverviewState);
  const { loading: locationsLoading, locationsLoaded } = useSelector(selectServiceLocationsState);

  useEffect(() => {
    if (!locationsLoading && !locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded, locationsLoading, pageState]);

  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchMonitorOverviewAction.get(pageState));
    }
  }, [dispatch, loaded, loading, pageState]);

  const {
    enablement: { isEnabled },
    loading: enablementLoading,
  } = useEnablement();

  const { syntheticsMonitors, loading: monitorsLoading } = useMonitorList();

  if (!enablementLoading && isEnabled && !monitorsLoading && syntheticsMonitors.length === 0) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }
  return !loading ? (
    <OverviewGrid />
  ) : (
    <EuiFlexGroup alignItems="center" justifyContent="center">
      <EuiSpacer size="xxl" />
      <EuiFlexItem grow={false}>
        <EuiLoadingElastic size="xxl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
