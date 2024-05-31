/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { TimePickerTimeDefaults } from '../components/shared/date_picker/typings';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export function useDefaultTimeRange() {
  const { core } = useApmPluginContext();

  const { from: rangeFrom, to: rangeTo } = core.uiSettings.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  return { rangeFrom, rangeTo };
}
