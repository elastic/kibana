/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

const DEFAULT_ENROLLMENT_TOKENS_TTL_S = 10 * 60; // 10 minutes

export const beatsManagementConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  defaultUserRoles: schema.arrayOf(schema.string(), { defaultValue: ['superuser'] }),
  encryptionKey: schema.string({ defaultValue: 'xpack_beats_default_encryptionKey' }),
  enrollmentTokensTtlInSeconds: schema.number({
    min: 1,
    max: 10 * 60 * 14, // No more then 2 weeks for security reasons,
    defaultValue: DEFAULT_ENROLLMENT_TOKENS_TTL_S,
  }),
});

export type BeatsManagementConfigType = TypeOf<typeof beatsManagementConfigSchema>;
