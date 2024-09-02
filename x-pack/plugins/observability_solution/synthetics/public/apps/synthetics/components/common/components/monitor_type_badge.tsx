/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormMonitorType, MonitorTypeEnum } from '../../../../../../common/runtime_types';

export function MonitorTypeBadge({
  monitorType,
  ariaLabel,
  onClick,
}: {
  monitorType: string;
  ariaLabel?: string;
  onClick?: () => void;
}) {
  return onClick ? (
    <EuiBadge
      onClick={onClick}
      onClickAriaLabel={getFilterTitle(monitorType)}
      title={ariaLabel}
      aria-label={ariaLabel}
      iconType={getMonitorTypeBadgeIcon(monitorType)}
      onMouseDown={(e: MouseEvent) => {
        // Prevents the click event from being propagated to the @elastic/chart metric
        e.stopPropagation();
      }}
    >
      {getMonitorTypeBadgeTitle(monitorType)}
    </EuiBadge>
  ) : (
    <EuiBadge
      title={ariaLabel}
      aria-label={ariaLabel}
      iconType={getMonitorTypeBadgeIcon(monitorType)}
      onMouseDown={(e: MouseEvent) => {
        // Prevents the click event from being propagated to the @elastic/chart metric
        e.stopPropagation();
      }}
    >
      {getMonitorTypeBadgeTitle(monitorType)}
    </EuiBadge>
  );
}

const getFilterTitle = (type: string) => {
  return i18n.translate('xpack.synthetics.management.monitorList.monitorTypeBadge.filter', {
    defaultMessage: 'Click to filter monitors for type: {type}',
    values: { type: getMonitorTypeBadgeTitle(type) },
  });
};

function getMonitorTypeBadgeTitle(monitorType: string) {
  switch (monitorType) {
    case FormMonitorType.TCP:
    case FormMonitorType.HTTP:
    case FormMonitorType.ICMP:
      return monitorType.toUpperCase();
    case FormMonitorType.SINGLE:
      return 'Page';
    case FormMonitorType.MULTISTEP:
      return 'Journey';
  }

  switch (monitorType) {
    case MonitorTypeEnum.BROWSER:
      return 'Journey';
    default:
      return monitorType.toUpperCase();
  }
}

function getMonitorTypeBadgeIcon(monitorType: string) {
  return monitorType === 'browser' ? 'videoPlayer' : 'online';
}
