/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, Logger } from '@kbn/core/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { getDeprecationsInfo as getApmUserRoleDeprecationsInfo } from './apm_user_role';

export interface DeprecationApmDeps {
  logger: Logger;
  security?: SecurityPluginSetup;
}

export const registerDeprecations = ({
  core,
  apmDeps,
}: {
  core: CoreSetup;
  apmDeps: DeprecationApmDeps;
}) => {
  core.deprecations.registerDeprecations({
    getDeprecations: async (ctx) => {
      return [...(await getApmUserRoleDeprecationsInfo(ctx, core, apmDeps))];
    },
  });
};
