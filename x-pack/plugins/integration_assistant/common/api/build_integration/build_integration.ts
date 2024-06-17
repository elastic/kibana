/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { Integration } from '../model/common_attributes';

export type BuildIntegrationRequestBody = z.infer<typeof BuildIntegrationRequestBody>;
export const BuildIntegrationRequestBody = z.object({
  integration: Integration,
});
export type BuildIntegrationRequestBodyInput = z.input<typeof BuildIntegrationRequestBody>;
