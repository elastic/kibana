/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { EuiSuperDatePicker, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

import { useHasData } from '../../../../../hooks/use_has_data';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { useQuickTimeRanges } from '../../../../../hooks/use_quick_time_ranges';
import { parseTimeParts } from '../../series_viewer/columns/utils';
import { useUiSetting } from '../../../../../../../../../src/plugins/kibana_react/public';
import { SeriesUrl } from '../../types';
import { ReportTypes } from '../../configurations/constants';

export interface TimePickerTime {
  from: string;
  to: string;
}

export interface TimePickerQuickRange extends TimePickerTime {
  display: string;
}

interface Props {
  seriesId: number;
  series: SeriesUrl;
  readonly?: boolean;
}
const readableUnit: Record<string, string> = {
  m: i18n.translate('xpack.observability.overview.exploratoryView.minutes', {
    defaultMessage: 'Minutes',
  }),
  h: i18n.translate('xpack.observability.overview.exploratoryView.hour', {
    defaultMessage: 'Hour',
  }),
  d: i18n.translate('xpack.observability.overview.exploratoryView.day', {
    defaultMessage: 'Day',
  }),
};

export function SeriesDatePicker({ series, seriesId, readonly = true }: Props) {
  const { onRefreshTimeRange } = useHasData();

  const commonlyUsedRanges = useQuickTimeRanges();

  const { setSeries, reportType, allSeries, firstSeries } = useSeriesStorage();

  function onTimeChange({ start, end }: { start: string; end: string }) {
    onRefreshTimeRange();
    if (reportType === ReportTypes.KPI) {
      allSeries.forEach((currSeries, seriesIndex) => {
        setSeries(seriesIndex, { ...currSeries, time: { from: start, to: end } });
      });
    } else {
      setSeries(seriesId, { ...series, time: { from: start, to: end } });
    }
  }

  const seriesTime = series.time ?? firstSeries!.time;

  const dateFormat = useUiSetting<string>('dateFormat').replace('ss.SSS', 'ss');

  if (readonly) {
    const timeParts = parseTimeParts(seriesTime?.from, seriesTime?.to);

    if (timeParts) {
      const {
        timeTense: timeTenseDefault,
        timeUnits: timeUnitsDefault,
        timeValue: timeValueDefault,
      } = timeParts;

      return (
        <EuiText color="subdued" size="s">{`${timeTenseDefault} ${timeValueDefault} ${
          readableUnit?.[timeUnitsDefault] ?? timeUnitsDefault
        }`}</EuiText>
      );
    } else {
      return (
        <EuiText color="subdued" size="s">
          {i18n.translate('xpack.observability.overview.exploratoryView.dateRangeReadonly', {
            defaultMessage: '{start} to {end}',
            values: {
              start: moment(seriesTime.from).format(dateFormat),
              end: moment(seriesTime.to).format(dateFormat),
            },
          })}
        </EuiText>
      );
    }
  }

  return (
    <EuiSuperDatePicker
      start={series?.time?.from}
      end={series?.time?.to}
      onTimeChange={onTimeChange}
      commonlyUsedRanges={commonlyUsedRanges}
      onRefresh={onTimeChange}
      showUpdateButton={false}
    />
  );
}
