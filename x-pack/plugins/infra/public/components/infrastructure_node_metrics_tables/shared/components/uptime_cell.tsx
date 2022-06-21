/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface UptimeCellProps {
  uptimeMs?: number;
}

export function UptimeCell({ uptimeMs }: UptimeCellProps) {
  if (uptimeMs === null || uptimeMs === undefined || isNaN(uptimeMs)) {
    return (
      <EuiTextColor color="subdued">
        <FormattedMessage
          id="xpack.infra.metricsTable.uptimeCell.metricNotAvailableLabel"
          defaultMessage="N/A"
          description="N/A is short for not available"
        />
      </EuiTextColor>
    );
  }

  return <span>{formatUptime(uptimeMs)}</span>;
}

const MS_PER_MINUTE = 1000 * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function formatUptime(uptimeMs: number): string {
  if (uptimeMs < MS_PER_HOUR) {
    const minutes = Math.floor(uptimeMs / MS_PER_MINUTE);

    if (minutes > 0) {
      i18n.translate('xpack.infra.metricsTable.uptimeCell.minutesLabel', {
        defaultMessage: '{minutes}m',
        values: {
          minutes,
        },
        description: 'm is short for minutes',
      });
    }

    return i18n.translate('xpack.infra.metricsTable.uptimeCell.lessThanOneMinuteLabel', {
      defaultMessage: '< a minute',
    });
  }

  if (uptimeMs < MS_PER_DAY) {
    const hours = Math.floor(uptimeMs / MS_PER_HOUR);
    const remainingUptimeMs = uptimeMs - hours * MS_PER_HOUR;
    const minutes = Math.floor(remainingUptimeMs / MS_PER_MINUTE);

    if (minutes > 0) {
      return i18n.translate('xpack.infra.metricsTable.uptimeCell.hoursAndMinutesLabel', {
        defaultMessage: '{hours}h {minutes}m',
        values: {
          hours,
          minutes,
        },
        description: 'h is short for hours, m for minutes',
      });
    }

    return i18n.translate('xpack.infra.metricsTable.uptimeCell.hoursLabel', {
      defaultMessage: '{hours}h',
      values: {
        hours,
      },
      description: 'h is short for hours',
    });
  }

  const days = Math.floor(uptimeMs / MS_PER_DAY);
  const remainingUptimeMs = uptimeMs - days * MS_PER_DAY;
  const hours = Math.floor(remainingUptimeMs / MS_PER_HOUR);

  if (hours > 0) {
    return i18n.translate('xpack.infra.metricsTable.uptimeCell.daysAndHoursLabel', {
      defaultMessage: '{days}d {hours}h',
      values: {
        days,
        hours,
      },
      description: 'd is short for days, h for hours',
    });
  }

  return i18n.translate('xpack.infra.metricsTable.uptimeCell.daysLabel', {
    defaultMessage: '{days}d',
    values: {
      days,
    },
    description: 'd is short for days',
  });
}
