/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { EuiBadge, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { toMomentUnitOfTime } from '../../../../utils/slo/duration';
import { toDurationLabel } from '../../../../utils/slo/labels';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloTimeWindowBadge({ slo }: Props) {
  const unit = slo.timeWindow.duration.slice(-1);
  if ('isRolling' in slo.timeWindow) {
    return (
      <EuiFlexItem grow={false}>
        <EuiBadge
          color={euiLightVars.euiColorDisabled}
          iconType="editorItemAlignRight"
          iconSide="left"
        >
          {toDurationLabel(slo.timeWindow.duration)}
        </EuiBadge>
      </EuiFlexItem>
    );
  }

  const unitMoment = toMomentUnitOfTime(unit);
  const now = moment.utc();

  const periodStart = now.clone().startOf(unitMoment!);
  const periodEnd = now.clone().endOf(unitMoment!);

  const totalDurationInDays = periodEnd.diff(periodStart, 'days') + 1;
  const elapsedDurationInDays = now.diff(periodStart, 'days') + 1;

  return (
    <EuiFlexItem grow={false}>
      <EuiBadge color={euiLightVars.euiColorDisabled} iconType="calendar" iconSide="left">
        {i18n.translate('xpack.observability.slo.slo.timeWindow.calendar', {
          defaultMessage: '{elapsed}/{total} days',
          values: {
            elapsed: Math.min(elapsedDurationInDays, totalDurationInDays),
            total: totalDurationInDays,
          },
        })}
      </EuiBadge>
    </EuiFlexItem>
  );
}
