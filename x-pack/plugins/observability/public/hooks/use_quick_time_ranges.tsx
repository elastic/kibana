/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '../../../../../src/plugins/kibana_react/public';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';
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
