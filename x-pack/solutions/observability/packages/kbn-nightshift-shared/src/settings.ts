/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';

export const SETTINGS_TAB_IDS = ['general', 'investigations', 'detections'] as const;

export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

export interface NightshiftSettingsLocatorParams extends SerializableRecord {
  tab?: SettingsTabId;
}
