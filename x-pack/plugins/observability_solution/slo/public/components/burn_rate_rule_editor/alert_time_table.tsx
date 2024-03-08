/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiSpacer, EuiText, EuiTitle, HorizontalAlignment } from '@elastic/eui';
import { SLOResponse } from '@kbn/slo-schema';
import React from 'react';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { WindowSchema } from '../../typings';
import { toDuration, toMinutes } from '../../utils/slo/duration';

interface AlertTimeTableProps {
  slo: SLOResponse;
  windows: WindowSchema[];
}

const ERROR_RATES = [0.01, 0.1, 0.2, 0.5, 1];

function formatTime(minutes: number) {
  if (minutes > 59) {
    const mins = minutes % 60;
    const hours = (minutes - mins) / 60;
    return i18n.translate('xpack.slo.rules.timeTable.minuteHoursLabel', {
      defaultMessage: '{hours}h {mins}m',
      values: { hours, mins },
    });
  }
  return i18n.translate('xpack.slo.rules.timeTable.minuteLabel', {
    defaultMessage: '{minutes}m',
    values: { minutes },
  });
}

export function AlertTimeTable({ windows, slo }: AlertTimeTableProps) {
  const rows = ERROR_RATES.map((rate) => {
    const windowTimes = windows.reduce((acc, windowDef, index) => {
      const windowInMinutes = toMinutes(
        toDuration(`${windowDef.longWindow.value}${windowDef.longWindow.unit}`)
      );
      const timeInMinutes = Math.round(
        ((1 - slo.objective.target) / rate) * windowInMinutes * windowDef.burnRateThreshold
      );
      return {
        ...acc,
        [`column_${index + 1}`]: timeInMinutes < windowInMinutes ? timeInMinutes : null,
      };
    }, {});
    return { rate, ...windowTimes };
  }) as Array<{ rate: number } & WindowSchema>;

  const columns = [
    {
      field: 'rate',
      name: i18n.translate('xpack.slo.rules.timeTable.rateColumnLabel', {
        defaultMessage: 'Error rate',
      }),
      render: (rate: number) => numeral(rate).format('0%'),
    },
    ...windows.map((windowDef, index) => ({
      field: `column_${index + 1}`,
      name: `${windowDef.longWindow.value}h @ ${numeral(windowDef.burnRateThreshold).format(
        '0[.0]'
      )}x`,
      align: 'right' as HorizontalAlignment,
      render: (time: number | null) => (time ? formatTime(time) : '-'),
    })),
  ];
  return (
    <>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.slo.rules.timeTable.title', {
            defaultMessage: 'How long will it take for the alert to fire?',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.slo.rules.timeTable.description', {
            defaultMessage:
              'The table below lists the error rates and approximately how long it would take to receive your first alert with the current configuration.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiBasicTable<{ rate: number } & WindowSchema>
        tableCaption={i18n.translate('xpack.slo.rules.tableCaption', {
          defaultMessage: 'Alerting time table',
        })}
        items={rows}
        columns={columns}
      />
      <EuiSpacer size="l" />
    </>
  );
}
