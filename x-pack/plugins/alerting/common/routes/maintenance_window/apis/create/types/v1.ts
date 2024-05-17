/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { createBodySchemaV1 } from '..';
import { MaintenanceWindowResponseV1 } from '../../../response';

export type CreateMaintenanceWindowRequestBody = TypeOf<typeof createBodySchemaV1>;

export interface CreateMaintenanceWindowResponse {
  body: MaintenanceWindowResponseV1;
}
