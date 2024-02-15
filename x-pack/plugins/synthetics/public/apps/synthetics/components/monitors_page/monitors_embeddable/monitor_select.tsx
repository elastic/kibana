/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ConfigKey } from '../../../../../../common/constants/monitor_management';

import { useMonitorList } from '../hooks/use_monitor_list';

export const MonitorSelect = ({
  monitors,
  monitorsLoading,
  selectedMonitor,
  setSelectedMonitor,
}: {
  monitors: ReturnType<typeof useMonitorList>['syntheticsMonitors'];
  monitorsLoading: boolean;
  selectedMonitor?: string;
  setSelectedMonitor: (monitor: string) => void;
}) => {
  const monitorOptions = monitors.map(({ name, [ConfigKey.MONITOR_QUERY_ID]: monitorId }) => ({
    text: name,
    value: monitorId,
  }));

  return (
    <EuiSelect
      data-test-subj="syntheticsMonitorSelectorEmbeddableMonitor"
      compressed={true}
      fullWidth
      prepend={i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.monitorLabel', {
        defaultMessage: 'Monitor',
      })}
      isLoading={monitorsLoading}
      options={monitorOptions}
      value={selectedMonitor}
      onChange={(event) => {
        setSelectedMonitor(event.target.value);
      }}
    />
  );
};
