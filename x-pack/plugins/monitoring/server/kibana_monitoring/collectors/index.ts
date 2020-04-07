/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSettingsCollector } from './get_settings_collector';
import { MonitoringConfig } from '../../config';

export function registerCollectors(usageCollection: any, config: MonitoringConfig) {
  usageCollection.registerCollector(getSettingsCollector(usageCollection, config));
}
