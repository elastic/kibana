/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '../../../observability/public';
import { getMonitors } from '../state/actions';
import { monitorManagementListSelector } from '../state/selectors';
import { MonitorManagementList } from '../components/monitor_management/monitor_list/monitor_list';

export const MonitorManagementPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'manage-monitors' });
  useTrackPageview({ app: 'uptime', path: 'manage-monitors', delay: 15000 });
  const dispatch = useDispatch();
  const monitorList = useSelector(monitorManagementListSelector);

  useEffect(() => {
    dispatch(getMonitors({ page: 1, perPage: 25 }));
  }, [dispatch]);

  return <MonitorManagementList monitorList={monitorList} pageSize={monitorList.list.perPage} />;
};
