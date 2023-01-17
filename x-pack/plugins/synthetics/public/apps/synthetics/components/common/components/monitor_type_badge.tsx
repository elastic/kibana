/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  EncryptedSyntheticsMonitor,
  ConfigKey,
  FormMonitorType,
  DataStream,
} from '../../../../../../common/runtime_types';

export function MonitorTypeBadge({ monitor }: { monitor: EncryptedSyntheticsMonitor }) {
  return (
    <EuiBadgeStyled>
      <EuiIcon size="s" type={getMonitorTypeBadgeIcon(monitor)} />{' '}
      {getMonitorTypeBadgeTitle(monitor)}
    </EuiBadgeStyled>
  );
}

function getMonitorTypeBadgeTitle(monitor: EncryptedSyntheticsMonitor) {
  switch (monitor[ConfigKey.FORM_MONITOR_TYPE]) {
    case FormMonitorType.TCP:
    case FormMonitorType.HTTP:
    case FormMonitorType.ICMP:
      return monitor?.type?.toUpperCase();
    case FormMonitorType.SINGLE:
      return 'Page';
    case FormMonitorType.MULTISTEP:
      return 'Journey';
  }

  switch (monitor?.type) {
    case DataStream.BROWSER:
      return 'Journey';
    default:
      return monitor?.type?.toUpperCase();
  }
}

function getMonitorTypeBadgeIcon(monitor: EncryptedSyntheticsMonitor) {
  return monitor?.type === 'browser' ? 'videoPlayer' : 'online';
}

const EuiBadgeStyled = euiStyled(EuiBadge)`
  &&& {
    .euiBadge__text {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
`;
