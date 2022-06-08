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
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { ADD_MONITOR_STEPS } from './form/config';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';

export const MonitorAddPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'add-monitor' });
  useTrackPageview({ app: 'synthetics', path: 'add-monitor', delay: 15000 });
  useMonitorAddEditBreadcrumbs();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);

  return (
    <MonitorForm>
      <MonitorSteps stepMap={ADD_MONITOR_STEPS} />
    </MonitorForm>
  );
};
