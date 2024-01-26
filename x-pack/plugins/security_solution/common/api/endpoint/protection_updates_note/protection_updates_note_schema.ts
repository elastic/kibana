/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const GetProtectionUpdatesNoteSchema = {
  params: schema.object({
    package_policy_id: schema.string(),
  }),
};

export const CreateUpdateProtectionUpdatesNoteSchema = {
  body: schema.object({
    note: schema.string(),
  }),
  params: schema.object({
    package_policy_id: schema.string(),
  }),
};
