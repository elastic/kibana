/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloTimeWindowBadge({ slo }: Props) {
  const duration = Number(slo.timeWindow.duration.slice(0, -1));
  const unit = slo.timeWindow.duration.slice(-1);
  if ('isRolling' in slo.timeWindow) {
    const label = toDurationLabel(duration, unit);
    return (
      <div>
        <EuiBadge
          color={euiLightVars.euiColorDisabled}
          iconType="editorItemAlignRight"
          iconSide="left"
        >
          {label}
        </EuiBadge>
      </div>
    );
  }

  const unitMoment = toMomentUnitOfTime(unit);
  const now = moment.utc();
  const startTime = moment.utc(slo.timeWindow.calendar.startTime);
  const differenceInUnit = now.diff(startTime, unitMoment);

  const periodStart = startTime
    .clone()
    .add(Math.floor(differenceInUnit / duration) * duration, unitMoment);
  const periodEnd = periodStart.clone().add(duration, unitMoment);

  const totalDurationInDays = periodEnd.diff(periodStart, 'days');
  const elapsedDurationInDays = now.diff(periodStart, 'days') + 1;

  return (
    <div>
      <EuiBadge color={euiLightVars.euiColorDisabled} iconType="calendar" iconSide="left">
        {i18n.translate('xpack.observability.slos.slo.timeWindow.calendar', {
          defaultMessage: '{elapsed}/{total} days',
          values: {
            elapsed: Math.min(elapsedDurationInDays, totalDurationInDays),
            total: totalDurationInDays,
          },
        })}
      </EuiBadge>
    </div>
  );
}

function toDurationLabel(duration: number, durationUnit: string) {
  switch (durationUnit) {
    case 'd':
      return i18n.translate('xpack.observability.slos.slo.timeWindow.days', {
        defaultMessage: '{duration} days',
        values: { duration },
      });
    case 'w':
      return i18n.translate('xpack.observability.slos.slo.timeWindow.days', {
        defaultMessage: '{duration} weeks',
        values: { duration },
      });
    case 'M':
      return i18n.translate('xpack.observability.slos.slo.timeWindow.days', {
        defaultMessage: '{duration} months',
        values: { duration },
      });
    case 'Q':
      return i18n.translate('xpack.observability.slos.slo.timeWindow.days', {
        defaultMessage: '{duration} quarters',
        values: { duration },
      });
    case 'Y':
      return i18n.translate('xpack.observability.slos.slo.timeWindow.days', {
        defaultMessage: '{duration} years',
        values: { duration },
      });
  }
}

const toMomentUnitOfTime = (unit: string): moment.unitOfTime.Diff | undefined => {
  switch (unit) {
    case 'd':
      return 'days';
    case 'w':
      return 'weeks';
    case 'M':
      return 'months';
    case 'Q':
      return 'quarters';
    case 'Y':
      return 'years';
  }
};
