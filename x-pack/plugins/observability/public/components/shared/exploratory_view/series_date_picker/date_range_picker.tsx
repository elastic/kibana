/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDatePicker, EuiDatePickerRange } from '@elastic/eui';
import DateMath from '@elastic/datemath';
import { Moment } from 'moment';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { useUiSetting } from '../../../../../../../../src/plugins/kibana_react/public';

export const parseAbsoluteDate = (date: string, options = {}) => {
  return DateMath.parse(date, options)!;
};
export function DateRangePicker({ seriesId }: { seriesId: string }) {
  const { firstSeriesId, getSeries, setSeries } = useSeriesStorage();
  const dateFormat = useUiSetting<string>('dateFormat');

  const {
    time: { from, to },
    reportType,
  } = getSeries(firstSeriesId);

  const series = getSeries(seriesId);

  const {
    time: { from: seriesFrom, to: seriesTo },
  } = series;

  const startDate = parseAbsoluteDate(seriesFrom ?? from)!;
  const endDate = parseAbsoluteDate(seriesTo ?? to, { roundUp: true })!;

  const onStartChange = (newDate: Moment) => {
    if (reportType === 'kpi-over-time') {
      const mainStartDate = parseAbsoluteDate(from)!;
      const mainEndDate = parseAbsoluteDate(to, { roundUp: true })!;
      const totalDuration = mainEndDate.diff(mainStartDate, 'millisecond');
      const newFrom = newDate.toISOString();
      const newTo = newDate.add(totalDuration, 'millisecond').toISOString();

      setSeries(seriesId, {
        ...series,
        time: { from: newFrom, to: newTo },
      });
    } else {
      const newFrom = newDate.toISOString();

      setSeries(seriesId, {
        ...series,
        time: { from: newFrom, to: seriesTo },
      });
    }
  };
  const onEndChange = (newDate: Moment) => {
    if (reportType === 'kpi-over-time') {
      const mainStartDate = parseAbsoluteDate(from)!;
      const mainEndDate = parseAbsoluteDate(to, { roundUp: true })!;
      const totalDuration = mainEndDate.diff(mainStartDate, 'millisecond');
      const newTo = newDate.toISOString();
      const newFrom = newDate.subtract(totalDuration, 'millisecond').toISOString();

      setSeries(seriesId, {
        ...series,
        time: { from: newFrom, to: newTo },
      });
    } else {
      const newTo = newDate.toISOString();

      setSeries(seriesId, {
        ...series,
        time: { from: seriesFrom, to: newTo },
      });
    }
  };

  return (
    <EuiDatePickerRange
      fullWidth
      startDateControl={
        <EuiDatePicker
          selected={startDate}
          onChange={onStartChange}
          startDate={startDate}
          endDate={endDate}
          isInvalid={startDate > endDate}
          aria-label={i18n.translate('xpack.observability.expView.dateRanger.startDate', {
            defaultMessage: 'Start date',
          })}
          dateFormat={dateFormat}
          showTimeSelect
        />
      }
      endDateControl={
        <EuiDatePicker
          selected={endDate}
          onChange={onEndChange}
          startDate={startDate}
          endDate={endDate}
          isInvalid={startDate > endDate}
          aria-label={i18n.translate('xpack.observability.expView.dateRanger.endDate', {
            defaultMessage: 'End date',
          })}
          dateFormat={dateFormat}
          showTimeSelect
        />
      }
    />
  );
}
