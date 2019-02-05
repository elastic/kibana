/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HapiServer } from '../../../../';
import { getUsageCollector } from './get_usage_collector';

export function registerVisualizationsCollector(server: HapiServer): void {
  const { usage } = server;
  const collector = usage.collectorSet.makeUsageCollector(getUsageCollector(server));
  usage.collectorSet.register(collector);
}
