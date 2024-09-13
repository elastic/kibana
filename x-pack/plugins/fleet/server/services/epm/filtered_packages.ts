/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';
import { FLEET_SERVER_PACKAGE } from '../../../common/constants';

export function getFilteredSearchPackages() {
  const shouldFilterFleetServer = appContextService.getConfig()?.internal?.fleetServerStandalone;
  const filtered: string[] = ['profiler_collector', 'profiler_symbolizer'];
  // Do not allow to search for Fleet server integration if configured to use  standalone fleet server
  if (shouldFilterFleetServer) {
    filtered.push(FLEET_SERVER_PACKAGE);
  }

  const excludePackages = appContextService.getConfig()?.internal?.registry?.excludePackages ?? [];

  return filtered.concat(excludePackages);
}

export function getFilteredInstallPackages() {
  const filtered: string[] = [];

  const excludePackages = appContextService.getConfig()?.internal?.registry?.excludePackages ?? [];

  return filtered.concat(excludePackages);
}
