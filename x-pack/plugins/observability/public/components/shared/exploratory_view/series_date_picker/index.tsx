/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useHasData } from '../../../../hooks/use_has_data';
import { UI_SETTINGS, useKibanaUISettings } from '../../../../hooks/use_kibana_ui_settings';
import { useUrlStorage } from '../hooks/use_url_strorage';
import { SeriesUrl } from '../types';

export interface TimePickerTime {
  from: string;
  to: string;
}

export interface TimePickerQuickRange extends TimePickerTime {
  display: string;
}

interface Props {
  seriesId: string;
}

export function SeriesDatePicker({ seriesId }: Props) {
  const { onRefreshTimeRange } = useHasData();

  const timePickerQuickRanges = useKibanaUISettings<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = timePickerQuickRanges.map(({ from, to, display }) => ({
    start: from,
    end: to,
    label: display,
  }));

  const storage = useUrlStorage();

  const series = storage.get<SeriesUrl>(seriesId);

  function onTimeChange({ start, end }: { start: string; end: string }) {
    onRefreshTimeRange();
    storage.set(seriesId, { ...series, time: { from: start, to: end } });
  }

  useEffect(() => {
    if (!series || !series.time) {
      storage.set(seriesId, { ...series, time: { from: 'now-15m', to: 'now' } });
    }
  }, []);

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
