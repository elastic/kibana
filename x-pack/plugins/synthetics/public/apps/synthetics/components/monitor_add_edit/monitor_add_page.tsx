/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useTrackPageview } from '@kbn/observability-plugin/public';

import { getServiceLocations } from '../../state';
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

  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);

  return (
    <MonitorForm space={space?.id}>
      <MonitorSteps stepMap={ADD_MONITOR_STEPS} />
    </MonitorForm>
  );
};

export const MonitorAddPageWithServiceAllowed = React.memo(() => (
  <ServiceAllowedWrapper>
    <MonitorAddPage />
  </ServiceAllowedWrapper>
));
