/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Settings } from '../models';

export interface GetSettingsResponse {
  item: Settings;
}

export interface PutSettingsRequest {
  body: Partial<Omit<Settings, 'id'>>;
}

export interface PutSettingsResponse {
  item: Settings;
}
