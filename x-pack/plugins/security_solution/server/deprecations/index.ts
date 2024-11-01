/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/server';
import type { ConfigType } from '../config';

import { getSignalsMigrationDeprecationsInfo } from './signals_migration';

export const registerDeprecations = ({ core, config }: { core: CoreSetup; config: ConfigType }) => {
  core.deprecations.registerDeprecations({
    getDeprecations: async (ctx) => {
      return [...(await getSignalsMigrationDeprecationsInfo(ctx, config))];
    },
  });
};
