/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SloStatus } from '../../../../common/service_inventory';

interface SloStatusConfig {
  id: string;
  color: 'danger' | 'warning' | 'success' | 'default' | 'hollow';
  showCount: boolean;
  tooltipContent: string;
  ariaLabel: (serviceName: string) => string;
  badgeLabel: (count?: number | string) => string;
}

export const SLO_COUNT_CAP = 50;

const SLO_STATUS_CONFIG: Record<SloStatus, SloStatusConfig> = {
  violated: {
    id: 'Violated',
    color: 'danger',
    showCount: true,
    tooltipContent: i18n.translate('xpack.apm.servicesTable.tooltip.sloViolated', {
      defaultMessage: 'One or more SLOs are violated. Click to view SLOs.',
    }),
    ariaLabel: (serviceName: string) =>
      i18n.translate('xpack.apm.servicesTable.sloViolatedAriaLabel', {
        defaultMessage: 'View violated SLOs for {serviceName}',
        values: { serviceName },
      }),
    badgeLabel: (count?: number | string) =>
      i18n.translate('xpack.apm.servicesTable.sloViolated', {
        defaultMessage: '{count} Violated',
        values: { count },
      }),
  },
  degrading: {
    id: 'Degrading',
    color: 'warning',
    showCount: true,
    tooltipContent: i18n.translate('xpack.apm.servicesTable.tooltip.sloDegrading', {
      defaultMessage: 'One or more SLOs are degrading. Click to view SLOs.',
    }),
    ariaLabel: (serviceName: string) =>
      i18n.translate('xpack.apm.servicesTable.sloDegradingAriaLabel', {
        defaultMessage: 'View degrading SLOs for {serviceName}',
        values: { serviceName },
      }),
    badgeLabel: (count?: number | string) =>
      i18n.translate('xpack.apm.servicesTable.sloDegrading', {
        defaultMessage: '{count} Degrading',
        values: { count },
      }),
  },
  noData: {
    id: 'NoData',
    color: 'default',
    showCount: false,
    tooltipContent: i18n.translate('xpack.apm.servicesTable.tooltip.sloNoData', {
      defaultMessage: 'One or more SLOs have no data. Click to view SLOs.',
    }),
    ariaLabel: (serviceName: string) =>
      i18n.translate('xpack.apm.servicesTable.sloNoDataAriaLabel', {
        defaultMessage: 'View SLOs with no data for {serviceName}',
        values: { serviceName },
      }),
    badgeLabel: () =>
      i18n.translate('xpack.apm.servicesTable.sloNoData', {
        defaultMessage: 'No data',
      }),
  },
  healthy: {
    id: 'Healthy',
    color: 'success',
    showCount: false,
    tooltipContent: i18n.translate('xpack.apm.servicesTable.tooltip.sloHealthy', {
      defaultMessage: 'All SLOs are healthy. Click to view details.',
    }),
    ariaLabel: (serviceName: string) =>
      i18n.translate('xpack.apm.servicesTable.sloHealthyAriaLabel', {
        defaultMessage: 'View healthy SLOs for {serviceName}',
        values: { serviceName },
      }),
    badgeLabel: () =>
      i18n.translate('xpack.apm.servicesTable.sloHealthy', {
        defaultMessage: 'Healthy',
      }),
  },
};

export function SloStatusBadge({
  sloStatus,
  sloCount,
  serviceName,
  onClick,
}: {
  sloStatus: SloStatus;
  sloCount?: number;
  serviceName: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  const config = SLO_STATUS_CONFIG[sloStatus];
  const cappedCount =
    config.showCount && sloCount
      ? sloCount >= SLO_COUNT_CAP
        ? `${SLO_COUNT_CAP}+`
        : sloCount
      : undefined;

  return (
    <EuiToolTip position="bottom" content={config.tooltipContent}>
      <EuiBadge
        data-test-subj={`serviceInventorySlo${config.id}Badge`}
        color={config.color}
        onClick={onClick}
        onClickAriaLabel={config.ariaLabel(serviceName)}
      >
        {config.badgeLabel(cappedCount)}
      </EuiBadge>
    </EuiToolTip>
  );
}
