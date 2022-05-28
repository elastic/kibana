/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextColor } from '@elastic/eui';
import React from 'react';

interface UptimeCellProps {
  uptimeMs?: number;
}

export function UptimeCell({ uptimeMs }: UptimeCellProps) {
  if (uptimeMs === null || uptimeMs === undefined || isNaN(uptimeMs)) {
    return <EuiTextColor color="subdued">N/A</EuiTextColor>;
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
      return `${minutes}m`;
    }

    return '< a minute';
  }

  if (uptimeMs < MS_PER_DAY) {
    const hours = Math.floor(uptimeMs / MS_PER_HOUR);
    const remainingUptimeMs = uptimeMs - hours * MS_PER_HOUR;
    const minutes = Math.floor(remainingUptimeMs / MS_PER_MINUTE);

    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${hours}h`;
  }

  const days = Math.floor(uptimeMs / MS_PER_DAY);
  const remainingUptimeMs = uptimeMs - days * MS_PER_DAY;
  const hours = Math.floor(remainingUptimeMs / MS_PER_HOUR);

  if (hours > 0) {
    return `${days}d ${hours}h`;
  }

  return `${days}d`;
}
