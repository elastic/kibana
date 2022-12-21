/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest } from 'rxjs';

import type { RouteDefinitionParams } from '..';
import type { SecurityCheckupState } from '../../../common/types';
import { createClusterDataCheck } from '../../security_checkup';

/**
 * Defines route that returns the state of the security checkup feature.
 */
export function defineSecurityCheckupGetStateRoutes({
  router,
  logger,
  config$,
  license,
}: RouteDefinitionParams) {
  let showInsecureClusterWarning = false;

  combineLatest([config$, license.features$]).subscribe(([config, { allowRbac }]) => {
    showInsecureClusterWarning = config.showInsecureClusterWarning && !allowRbac;
  });

  const doesClusterHaveUserData = createClusterDataCheck();

  router.get(
    { path: '/internal/security/security_checkup/state', validate: false },
    async (context, _request, response) => {
      const esClient = (await context.core).elasticsearch.client;
      let displayAlert = false;
      if (showInsecureClusterWarning) {
        displayAlert = await doesClusterHaveUserData(esClient.asInternalUser, logger);
      }

      const state: SecurityCheckupState = {
        displayAlert,
      };
      return response.ok({ body: state });
    }
  );
}
