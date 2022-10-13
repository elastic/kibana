/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { TimePickerQuickRange } from '../components/shared/exploratory_view/components/series_date_picker';

export function useQuickTimeRanges() {
  const timePickerQuickRanges = useUiSetting<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  return timePickerQuickRanges.map(({ from, to, display }) => ({
    start: from,
    end: to,
    label: display,
  }));
}
