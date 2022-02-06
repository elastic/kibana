/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';

// TODO: snake case
export const cspRuleAssetSavedObjectType = 'csp_config';

export const cspDataYamlSchema = rt.string();

export type CspConfigSchema = TypeOf<typeof cspDataYamlSchema>;
