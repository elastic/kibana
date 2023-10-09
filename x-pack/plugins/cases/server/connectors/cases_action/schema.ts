/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/**
 * The case connector does not have any configuration
 * or secrets.
 */
export const CasesConnectorConfigSchema = schema.object({});
export const CasesConnectorSecretsSchema = schema.object({});
/**
 * TODO: Add needed properties in the params schema.
 */
export const CasesConnectorParamsSchema = schema.object({});

export type CasesConnectorConfig = TypeOf<typeof CasesConnectorConfigSchema>;
export type CasesConnectorSecrets = TypeOf<typeof CasesConnectorSecretsSchema>;
export type CasesConnectorParams = TypeOf<typeof CasesConnectorParamsSchema>;
