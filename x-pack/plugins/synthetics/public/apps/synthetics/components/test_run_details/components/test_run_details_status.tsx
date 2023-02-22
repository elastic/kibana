/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiDescriptionList, EuiLoadingContent } from '@elastic/eui';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { useMonitorLatestPing } from '../../monitor_details/hooks/use_monitor_latest_ping';
import { useSelectedMonitor } from '../../monitor_details/hooks/use_selected_monitor';
import { BadgeStatus, MonitorStatus, STATUS_LABEL } from '../../common/components/monitor_status';

export const TestRunDetailsStatus = () => {
  const { latestPing, loading: pingsLoading } = useMonitorLatestPing();

  const { monitor, isMonitorMissing } = useSelectedMonitor();

  const { data: stepsData } = useJourneySteps();

  if (!monitor) {
    return (
      <EuiDescriptionList
        align="left"
        compressed={false}
        listItems={[
          {
            title: STATUS_LABEL,
            description:
              isMonitorMissing && stepsData?.details ? (
                <BadgeStatus
                  status={stepsData.details.journey.monitor.status}
                  isBrowserType={stepsData.details.journey.monitor.type === 'browser'}
                />
              ) : (
                <EuiLoadingContent lines={1} />
              ),
          },
        ]}
      />
    );
  }

  return (
    <MonitorStatus
      status={latestPing?.monitor.status}
      monitor={monitor}
      loading={pingsLoading}
      compressed={false}
    />
  );
};
