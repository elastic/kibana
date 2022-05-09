/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDatePicker, EuiDatePickerRange } from '@elastic/eui';
import { Moment } from 'moment';
import DateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { SeriesUrl } from '../types';
import { ReportTypes } from '../configurations/constants';

export const parseRelativeDate = (date: string, options = {}): Moment | void => {
  return DateMath.parse(date, options)!;
};

export function DateRangePicker({ seriesId, series }: { seriesId: number; series: SeriesUrl }) {
  const { firstSeries, setSeries, reportType } = useSeriesStorage();
  const dateFormat = useUiSetting<string>('dateFormat');

  const seriesFrom = series.time?.from;
  const seriesTo = series.time?.to;

  const { from: mainFrom, to: mainTo } = firstSeries!.time;

  const startDate = parseRelativeDate(seriesFrom ?? mainFrom)!;
  const endDate = parseRelativeDate(seriesTo ?? mainTo, { roundUp: true })!;

  const getTotalDuration = () => {
    const mainStartDate = parseRelativeDate(mainFrom)!;
    const mainEndDate = parseRelativeDate(mainTo, { roundUp: true })!;
    return mainEndDate.diff(mainStartDate, 'millisecond');
  };

  const onStartChange = (newStartDate: Moment) => {
    if (reportType === ReportTypes.KPI) {
      const totalDuration = getTotalDuration();
      const newFrom = newStartDate.toISOString();
      const newTo = newStartDate.add(totalDuration, 'millisecond').toISOString();

      setSeries(seriesId, {
        ...series,
        time: { from: newFrom, to: newTo },
      });
    } else {
      const newFrom = newStartDate.toISOString();

      setSeries(seriesId, {
        ...series,
        time: { from: newFrom, to: seriesTo },
      });
    }
  };

  const onEndChange = (newEndDate: Moment) => {
    if (reportType === ReportTypes.KPI) {
      const totalDuration = getTotalDuration();
      const newTo = newEndDate.toISOString();
      const newFrom = newEndDate.subtract(totalDuration, 'millisecond').toISOString();

      setSeries(seriesId, {
        ...series,
        time: { from: newFrom, to: newTo },
      });
    } else {
      const newTo = newEndDate.toISOString();

      setSeries(seriesId, {
        ...series,
        time: { from: seriesFrom, to: newTo },
      });
    }
  };

  return (
    <EuiDatePickerRange
      fullWidth
      isCustom
      startDateControl={
        <EuiDatePicker
          fullWidth
          selected={startDate}
          onChange={onStartChange}
          startDate={startDate}
          endDate={endDate}
          isInvalid={startDate > endDate}
          aria-label={i18n.translate('xpack.observability.expView.dateRanger.startDate', {
            defaultMessage: 'Start date',
          })}
          dateFormat={dateFormat.replace('ss.SSS', 'ss')}
          showTimeSelect
          popoverPlacement="right"
        />
      }
      endDateControl={
        <EuiDatePicker
          fullWidth
          showIcon={false}
          selected={endDate}
          onChange={onEndChange}
          startDate={startDate}
          endDate={endDate}
          isInvalid={startDate > endDate}
          aria-label={i18n.translate('xpack.observability.expView.dateRanger.endDate', {
            defaultMessage: 'End date',
          })}
          dateFormat={dateFormat.replace('ss.SSS', 'ss')}
          showTimeSelect
          popoverPlacement="right"
        />
      }
    />
  );
}
