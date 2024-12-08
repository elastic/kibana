/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup } from '@kbn/core/server';
import { getLegacyRbacDeprecationsInfo } from './legacy_rbac';

export const registerDeprecations = ({ core }: { core: CoreSetup }) => {
  core.deprecations.registerDeprecations({
    getDeprecations: async (context) => {
      return [...(await getLegacyRbacDeprecationsInfo(context))];
    },
  });
};
