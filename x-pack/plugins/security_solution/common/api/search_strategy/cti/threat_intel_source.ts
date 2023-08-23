/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from 'zod';
import { requestBasicOptionsSchema } from '../model/request_basic_options';

export const threatIntelSourceRequestOptionsSchema = requestBasicOptionsSchema;

export type ThreatIntelSourceRequestOptionsInput = z.input<
  typeof threatIntelSourceRequestOptionsSchema
>;

export type ThreatIntelSourceRequestOptions = z.infer<typeof threatIntelSourceRequestOptionsSchema>;
