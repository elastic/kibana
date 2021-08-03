/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Schema } from '../definition';
import { commonEcsSchema } from './schema/common_ecs_fields';
import { technicalFieldSchema } from './schema/technical_fields';

export const commonSchema = Schema.combine(commonEcsSchema, technicalFieldSchema);

export type CommonFields = typeof commonSchema.event;
