/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  actionSchema,
  actionRequestSchema,
  systemActionSchema,
  systemActionRequestSchema,
} from '../schemas';

export type ActionRequest = TypeOf<typeof actionRequestSchema>;
export type SystemActionRequest = TypeOf<typeof systemActionRequestSchema>;

export type Action = TypeOf<typeof actionSchema>;
export type SystemAction = TypeOf<typeof systemActionSchema>;
