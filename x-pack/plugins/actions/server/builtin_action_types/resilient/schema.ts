/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ExternalIncidentServiceConfiguration } from '../case/schema';

export const ResilientPublicConfiguration = {
  orgId: schema.string(),
  ...ExternalIncidentServiceConfiguration,
};

export const ResilientPublicConfigurationSchema = schema.object(ResilientPublicConfiguration);

export const ResilientSecretConfiguration = {
  apiKeyId: schema.string(),
  apiKeySecret: schema.string(),
};

export const ResilientSecretConfigurationSchema = schema.object(ResilientSecretConfiguration);
