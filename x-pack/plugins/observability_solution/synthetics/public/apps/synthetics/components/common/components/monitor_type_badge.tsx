/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, KeyboardEvent } from 'react';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { FormMonitorType, MonitorTypeEnum } from '../../../../../../common/runtime_types';

export function MonitorTypeBadge({
  monitorType,
  ariaLabel,
  onClick,
  onKeyPress,
}: {
  monitorType: string;
  ariaLabel?: string;
  onClick?: (evt: MouseEvent<HTMLDivElement>) => void;
  onKeyPress?: (evt: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const badge = (
    <EuiBadgeStyled data-is-clickable={!!onClick}>
      <EuiIcon size="s" type={getMonitorTypeBadgeIcon(monitorType)} />{' '}
      {getMonitorTypeBadgeTitle(monitorType)}
    </EuiBadgeStyled>
  );

  return onClick ? (
    <div title={ariaLabel} aria-label={ariaLabel} onClick={onClick} onKeyPress={onKeyPress}>
      {badge}
    </div>
  ) : (
    badge
  );
}

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

const EuiBadgeStyled = euiStyled(EuiBadge)<{ 'data-is-clickable': boolean }>`
  ${({ 'data-is-clickable': dataIsClickable }) => (dataIsClickable ? `cursor: pointer;` : '')}
  &&& {
    .euiBadge__text {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
`;
