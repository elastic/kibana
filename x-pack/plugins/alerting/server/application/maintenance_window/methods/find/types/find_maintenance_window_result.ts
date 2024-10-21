/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { findMaintenanceWindowsResultSchema, findMaintenanceWindowsParamsSchema } from '../schemas';

export type FindMaintenanceWindowsResult = TypeOf<typeof findMaintenanceWindowsResultSchema>;
export type FindMaintenanceWindowsParamsSchema = TypeOf<typeof findMaintenanceWindowsParamsSchema>;
