/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup } from '@kbn/core/server';
import { getDeprecationsInfo as getIlmPolicyDeprecationsInfo } from './migrate_existing_indices_ilm_policy';

export const registerDeprecations = ({ core }: { core: CoreSetup }) => {
  core.deprecations.registerDeprecations({
    getDeprecations: async (ctx) => {
      return await getIlmPolicyDeprecationsInfo(ctx);
    },
  });
};
