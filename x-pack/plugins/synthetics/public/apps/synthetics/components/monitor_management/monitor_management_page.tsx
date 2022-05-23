/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { monitorListSelector } from '../../state/monitor_management/selectors';
import { fetchMonitorListAction } from '../../state/monitor_management/monitor_list';
import { GETTING_STARTED_ROUTE } from '../../../../../common/constants';
import { useMonitorManagementBreadcrumbs } from './use_breadcrumbs';

export const MonitorManagementPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'manage-monitors' });
  useTrackPageview({ app: 'synthetics', path: 'manage-monitors', delay: 15000 });
  useMonitorManagementBreadcrumbs();

  const dispatch = useDispatch();

  const { total } = useSelector(monitorListSelector);

  useEffect(() => {
    dispatch(fetchMonitorListAction.get());
  }, [dispatch]);

  if (total === 0) {
    return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

  return (
    <>
      <p>This page is under construction and will be updated in a future release</p>
    </>
  );
};
