/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import moment from 'moment';
import { parseTimestamp } from '../parse_timestamp';
import { Ping } from '../../../../../common/runtime_types/ping';

interface Props {
  timestamp: string;
  ping: Ping;
}

function formatDuration(period) {
  const parts = [];
  const duration = moment.duration(period);

  // return nothing when the duration is falsy or not correctly parsed (P0D)
  if (!duration || duration.toISOString() === 'P0D') return;

  if (duration.years() >= 1) {
    const years = Math.floor(duration.years());
    parts.push(years + ' ' + (years > 1 ? 'years' : 'year'));
  }

  if (duration.months() >= 1) {
    const months = Math.floor(duration.months());
    parts.push(months + ' ' + (months > 1 ? 'months' : 'month'));
  }

  if (duration.days() >= 1) {
    const days = Math.floor(duration.days());
    parts.push(days + ' ' + (days > 1 ? 'days' : 'day'));
  }

  if (duration.hours() >= 1) {
    const hours = Math.floor(duration.hours());
    parts.push(hours + ' ' + (hours > 1 ? 'hours' : 'hour'));
  }

  if (duration.minutes() >= 1) {
    const minutes = Math.floor(duration.minutes());
    parts.push(minutes + ' ' + (minutes > 1 ? 'minutes' : 'minute'));
  }

  if (duration.seconds() >= 1) {
    const seconds = Math.floor(duration.seconds());
    parts.push(seconds + ' ' + (seconds > 1 ? 'seconds' : 'second'));
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(', ');
}

export const DurationInfo = ({ timestamp: tsString, ping }: Props) => {
  const timestamp = parseTimestamp(tsString);

  const timeSpan = ping.monitor.timespan;

  const diff = moment(timeSpan?.lt).diff(moment(timeSpan?.gte));

  const nextCheckVal = moment(timestamp).add(diff).diff(moment());

  const [nextCheck, setNextCheck] = useState(nextCheckVal);

  useEffect(() => {
    setTimeout(() => {
      setNextCheck(moment(timestamp).add(diff).diff(moment()));
    }, 1000);
  });

  const nextCheckDuration = formatDuration(nextCheck);

  return (
    <>
      <EuiText color="ghost" size="xs">
        Last check: {timestamp.fromNow()}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText color="ghost" size="xs">
        {nextCheckDuration === null
          ? 'Refresh app to see next check'
          : 'Next check: in ' + nextCheckDuration}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText color="ghost" size="xs">
        {'Checked every ' + formatDuration(diff)}
      </EuiText>
    </>
  );
};
