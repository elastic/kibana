/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';

export type { SiemMigrationsService } from './siem_migrations_service';

export const createSiemMigrationsService = async (coreStart: CoreStart) => {
  const { SiemMigrationsService } = await import(
    /* webpackChunkName: "lazySiemMigrationsService" */
    './siem_migrations_service'
  );
  return new SiemMigrationsService(coreStart);
};
