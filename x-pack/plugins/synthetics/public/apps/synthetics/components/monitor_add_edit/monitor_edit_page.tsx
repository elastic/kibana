/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTrackPageview, useFetcher } from '@kbn/observability-plugin/public';
import { getServiceLocations } from '../../state';
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';
import { getMonitorAPI } from '../../state/monitor_management/api';
import { EDIT_MONITOR_STEPS } from './form/config';

export const MonitorEditPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'edit-monitor' });
  useTrackPageview({ app: 'synthetics', path: 'edit-monitor', delay: 15000 });
  const { monitorId } = useParams<{ monitorId: string }>();
  useMonitorAddEditBreadcrumbs(true);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);

  const { data, status, error } = useFetcher(() => {
    return getMonitorAPI({ id: monitorId });
  }, []);

  return data ? (
    <MonitorForm defaultValues={data?.attributes}>
      <MonitorSteps stepMap={EDIT_MONITOR_STEPS} isEditFlow={true} />
    </MonitorForm>
  ) : null;
};
