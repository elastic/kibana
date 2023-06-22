/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { GlobalSearchPluginStart } from '@kbn/global-search-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { TrackUiMetricFn } from '../types';

/* @internal */
export interface SearchBarProps {
  globalSearch: GlobalSearchPluginStart;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  trackUiMetric: TrackUiMetricFn;
  taggingApi?: SavedObjectTaggingPluginStart;
  basePathUrl: string;
  darkMode: boolean;
}
