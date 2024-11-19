/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

export type SavedObjectTaggingPluginStart = SavedObjectsTaggingApi;

export type StartServices = Pick<
  CoreStart,
  'overlays' | 'notifications' | 'analytics' | 'i18n' | 'theme' | 'userProfile'
>;
