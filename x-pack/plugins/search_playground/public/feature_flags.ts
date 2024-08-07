/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { SEARCH_PLAYGROUND_QUERY_BUILDER_FEATURE_FLAG_ID } from '../common';

export function isSearchPlaygroundEnabled(uiSettings: IUiSettingsClient): boolean {
  return uiSettings.get<boolean>(SEARCH_PLAYGROUND_QUERY_BUILDER_FEATURE_FLAG_ID, false);
}
