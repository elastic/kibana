/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient } from '@kbn/core/server';
import type { SiemRuleMigrationsClient, SiemRuleMigrationsGetClientParams } from './rules/types';

export interface SiemMigrationsSetupParams {
  esClusterClient: IClusterClient;
  tasksTimeoutMs?: number;
}

export type SiemMigrationsGetClientParams = SiemRuleMigrationsGetClientParams;

export interface SiemMigrationsClient {
  rules: SiemRuleMigrationsClient;
}
