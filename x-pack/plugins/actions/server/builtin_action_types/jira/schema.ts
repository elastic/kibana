/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ConnectorPublicConfiguration } from '../case/schema';

export const JiraPublicConfiguration = {
  projectKey: schema.string(),
  ...ConnectorPublicConfiguration,
};

export const JiraPublicConfigurationSchema = schema.object(JiraPublicConfiguration);

export const JiraSecretConfiguration = {
  email: schema.string(),
  apiToken: schema.string(),
};

export const JiraSecretConfigurationSchema = schema.object(JiraSecretConfiguration);
