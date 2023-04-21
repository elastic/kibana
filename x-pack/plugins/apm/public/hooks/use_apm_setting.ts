/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  ApmSettingName,
  getApmSettings,
  ValueOfApmSetting,
} from '../../common/apm_settings';

export function useApmSetting<TApmSettingName extends ApmSettingName>(
  setting: TApmSettingName
): ValueOfApmSetting<TApmSettingName> {
  const settings = useMemo(() => {
    // this should be replaced with an API call
    return getApmSettings();
  }, []);

  return settings[setting];
}
