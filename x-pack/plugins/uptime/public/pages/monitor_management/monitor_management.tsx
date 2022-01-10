/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '../../../../observability/public';
import { getMonitors } from '../../state/actions';
import { monitorManagementListSelector } from '../../state/selectors';
import { MonitorManagementList } from '../../components/monitor_management/monitor_list/monitor_list';

export const MonitorManagementPage: React.FC = () => {
  const [refresh, setRefresh] = useState(true);
  const [pageIndex, setPageIndex] = useState(1); // saved objects page index is base 1
  const [pageSize, setPageSize] = useState(10); // saved objects page index is base 1
  useTrackPageview({ app: 'uptime', path: 'manage-monitors' });
  useTrackPageview({ app: 'uptime', path: 'manage-monitors', delay: 15000 });
  const dispatch = useDispatch();
  const monitorList = useSelector(monitorManagementListSelector);

  useEffect(() => {
    if (refresh) {
      dispatch(getMonitors({ page: pageIndex, perPage: pageSize }));
      setRefresh(false); // TODO: avoid extra re-rendering when `refresh` turn to false (pass down the handler instead)
    }
  }, [dispatch, refresh, pageIndex, pageSize]);

  return (
    <MonitorManagementList
      monitorList={monitorList}
      setPageSize={setPageSize}
      setPageIndex={setPageIndex}
      setRefresh={setRefresh}
    />
  );
};
