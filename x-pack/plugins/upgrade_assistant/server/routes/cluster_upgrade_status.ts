/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerClusterUpgradeStatusRoutes({ router }: RouteDependencies) {
  router.get(
    { path: `${API_BASE_PATH}/cluster_upgrade_status`, validate: false },
    // We're just depending on the version check to return a 426.
    // Otherwise we just return a 200.
    versionCheckHandlerWrapper(async (context, request, response) => {
      return response.ok();
    })
  );
}
