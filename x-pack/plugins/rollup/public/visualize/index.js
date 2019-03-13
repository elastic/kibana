/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { initAggTypeFilter } from './agg_type_filter';
import { initAggTypeFieldFilter } from './agg_type_field_filter';
import { initEditorConfig } from './editor_config';
import { CONFIG_ROLLUPS } from '../../common';

const uiSettings = chrome.getUiSettingsClient();
const isRollupIndexPatternsEnabled = uiSettings.get(CONFIG_ROLLUPS);

if (isRollupIndexPatternsEnabled) {
  initAggTypeFilter();
  initAggTypeFieldFilter();
  initEditorConfig();
}
