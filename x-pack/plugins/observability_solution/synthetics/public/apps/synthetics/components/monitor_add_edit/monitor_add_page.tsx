/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';

import { useCanUsePublicLocations } from '../../../../hooks/use_capabilities';
import { CanUsePublicLocationsCallout } from './steps/can_use_public_locations_callout';
import { DisabledCallout } from '../monitors_page/management/disabled_callout';
import { useEnablement } from '../../hooks';
import { getServiceLocations, selectServiceLocationsState } from '../../state';

import { useKibanaSpace } from './hooks';
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { LocationsLoadingError } from './locations_loading_error';
import { ADD_MONITOR_STEPS } from './steps/step_config';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';
import { LoadingState } from '../monitors_page/overview/overview/monitor_detail_flyout';

export const MonitorAddPage = () => {
  useTrackPageview({ app: 'synthetics', path: 'add-monitor' });
  const { space } = useKibanaSpace();
  useTrackPageview({ app: 'synthetics', path: 'add-monitor', delay: 15000 });
  useMonitorAddEditBreadcrumbs();

  useEnablement();

  const canUsePublicLocations = useCanUsePublicLocations();

  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);
  const { locationsLoaded, error: locationsError } = useSelector(selectServiceLocationsState);

  if (locationsError) {
    return <LocationsLoadingError />;
  }

  if (!locationsLoaded) {
    return <LoadingState />;
  }

  return (
    <MonitorForm space={space?.id}>
      <DisabledCallout />
      <CanUsePublicLocationsCallout canUsePublicLocations={canUsePublicLocations} />
      <MonitorSteps stepMap={ADD_MONITOR_STEPS} />
    </MonitorForm>
  );
};
