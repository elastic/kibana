/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment-timezone';
import {
  asAbsoluteDateTime,
  TimeUnit,
} from '../../../../common/utils/formatters';

interface Props {
  /**
   * timestamp in milliseconds or ISO timestamp
   */
  time: number | string;
  timeUnit?: TimeUnit;
}

export function TimestampTooltip({ time, timeUnit = 'milliseconds' }: Props) {
  const momentTime = moment(time);
  const relativeTimeLabel = momentTime.fromNow();
  const absoluteTimeLabel = asAbsoluteDateTime(time, timeUnit);

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{relativeTimeLabel}</>
    </EuiToolTip>
  );
}
