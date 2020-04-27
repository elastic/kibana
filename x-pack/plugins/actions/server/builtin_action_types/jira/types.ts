/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { JiraPublicConfigurationSchema, JiraSecretConfigurationSchema } from './schema';

export type JiraPublicConfigurationType = TypeOf<typeof JiraPublicConfigurationSchema>;
export type JiraSecretConfigurationType = TypeOf<typeof JiraSecretConfigurationSchema>;
