/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePickerCommonRange } from '@elastic/eui';
import { TimePickerQuickRange } from './use_kibana_ui_setting';

export const mapKibanaQuickRangesToDatePickerRanges = (
  timepickerQuickRanges: TimePickerQuickRange[] | undefined
): EuiSuperDatePickerCommonRange[] =>
  timepickerQuickRanges
    ? timepickerQuickRanges.map((r) => ({
        start: r.from,
        end: r.to,
        label: r.display,
      }))
    : [];
