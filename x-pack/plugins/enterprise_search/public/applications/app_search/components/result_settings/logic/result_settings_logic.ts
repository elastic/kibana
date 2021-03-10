/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface ResultSettingsActions {}

interface ResultSettingsValues {}

export const ResultSettingsLogic = kea<MakeLogicType<ResultSettingsValues, ResultSettingsActions>>({
  path: ['enterprise_search', 'app_search', 'result_settings_logic'],
  actions: () => ({}),
  reducers: () => ({}),
});
