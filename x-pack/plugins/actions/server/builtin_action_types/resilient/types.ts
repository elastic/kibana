/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { ResilientPublicConfigurationSchema, ResilientSecretConfigurationSchema } from './schema';

export type ResilientPublicConfigurationType = TypeOf<typeof ResilientPublicConfigurationSchema>;
export type ResilientSecretConfigurationType = TypeOf<typeof ResilientSecretConfigurationSchema>;

interface CreateIncidentBasicRequestArgs {
  name: string;
  description: string;
  discovered_date: number;
}

interface Comment {
  text: { format: string; content: string };
}

interface CreateIncidentRequestArgs extends CreateIncidentBasicRequestArgs {
  comments?: Comment[];
}

export type CreateIncidentRequest = CreateIncidentRequestArgs;
export type UpdateIncidentRequest = Partial<CreateIncidentBasicRequestArgs>;
export type CreateCommentRequest = Comment;
