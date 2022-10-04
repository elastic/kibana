/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { MonitorSelector } from '../monitor_details/monitor_selector/monitor_selector';
import { RunTestManually } from '../monitor_details/run_test_manually';
import { getMonitorStatusAction, selectLatestPing } from '../../state';
import { MonitorSummaryLastRunInfo } from '../monitor_details/last_run_info';

export const MonitorSummaryTitle = () => {
  const dispatch = useDispatch();

  const data = useSelector(selectLatestPing);

  const { monitorId } = useParams<{ monitorId: string }>();

  useEffect(() => {
    dispatch(getMonitorStatusAction.get({ monitorId, dateStart: 'now-30d', dateEnd: 'now' }));
  }, [dispatch, monitorId]);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}> {data?.monitor.name}</EuiFlexItem>
          <EuiFlexItem>
            <MonitorSelector />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{data && <MonitorSummaryLastRunInfo ping={data} />}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RunTestManually />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
