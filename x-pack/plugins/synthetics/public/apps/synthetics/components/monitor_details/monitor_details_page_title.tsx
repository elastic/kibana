/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useSelectedLocation } from './hooks/use_selected_location';
import { getMonitorRecentPingsAction, selectLatestPing, selectPingsLoading } from '../../state';
import { MonitorSummaryLastRunInfo } from './last_run_info';

export const MonitorDetailsPageTitle = () => {
  const dispatch = useDispatch();

  const latestPing = useSelector(selectLatestPing);
  const pingsLoading = useSelector(selectPingsLoading);

  const { monitorId } = useParams<{ monitorId: string }>();
  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  useEffect(() => {
    const locationId = location?.label;
    if (monitorId && locationId) {
      dispatch(getMonitorRecentPingsAction.get({ monitorId, locationId }));
    }
  }, [dispatch, monitorId, location]);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>{monitor?.name}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        {pingsLoading || (latestPing && latestPing.monitor.id !== monitorId) ? (
          <EuiLoadingContent data-test-subj="monitorDetailsPageTitleLoading" lines={1} />
        ) : latestPing ? (
          <MonitorSummaryLastRunInfo ping={latestPing} />
        ) : (
          <EuiText>
            {i18n.translate('xpack.synthetics.monitorSummary.noLastRunInformationAvailable', {
              defaultMessage: 'No last run information available for {location} yet.',
              values: {
                location: location?.label,
              },
            })}
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
