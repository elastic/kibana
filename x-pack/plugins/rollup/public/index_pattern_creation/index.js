/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { initIndexPatternCreation } from './register';
import { CONFIG_ROLLUPS } from '../../common';

const uiSettings = chrome.getUiSettingsClient();
const isRollupIndexPatternsEnabled = uiSettings.get(CONFIG_ROLLUPS);

if (isRollupIndexPatternsEnabled) {
  initIndexPatternCreation();
}
