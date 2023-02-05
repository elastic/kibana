/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-plugin/public';

import { getServiceLocations, selectServiceLocationsState } from '../../state';
import { ServiceAllowedWrapper } from '../common/wrappers/service_allowed_wrapper';

import { useKibanaSpace } from './hooks';
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { ADD_MONITOR_STEPS } from './steps/step_config';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';

const MonitorAddPage = () => {
  useTrackPageview({ app: 'synthetics', path: 'add-monitor' });
  const { space } = useKibanaSpace();
  useTrackPageview({ app: 'synthetics', path: 'add-monitor', delay: 15000 });
  useMonitorAddEditBreadcrumbs();
  const dispatch = useDispatch();
  const { locationsLoaded, error: locationsError } = useSelector(selectServiceLocationsState);

  useEffect(() => {
    if (!locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded]);

  if (locationsError) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        color="danger"
        title={<h3>Unable to testing locations</h3>}
        body={<p>There was an error loading testing locations. Please try again later.</p>}
      />
    );
  }

  return !locationsLoaded ? (
    <MonitorForm space={space?.id}>
      <MonitorSteps stepMap={ADD_MONITOR_STEPS} />
    </MonitorForm>
  ) : (
    <EuiEmptyPrompt
      icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
      title={<h3>Loading</h3>}
    />
  );
};

export const MonitorAddPageWithServiceAllowed = React.memo(() => (
  <ServiceAllowedWrapper>
    <MonitorAddPage />
  </ServiceAllowedWrapper>
));
