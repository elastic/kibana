/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ConditionEntryField, OperatingSystem } from '../types';
import { getDuplicateFields, isValidHash } from '../validation/trusted_apps';

const entryFieldLabels: { [k in ConditionEntryField]: string } = {
  [ConditionEntryField.HASH]: 'Hash',
  [ConditionEntryField.PATH]: 'Path',
  [ConditionEntryField.SIGNER]: 'Signer',
};

export const DeleteTrustedAppsRequestSchema = {
  params: schema.object({
    id: schema.string(),
  }),
};

export const GetTrustedAppsRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
    per_page: schema.maybe(schema.number({ defaultValue: 20, min: 1 })),
  }),
};

const ConditionEntryTypeSchema = schema.literal('match');
const ConditionEntryOperatorSchema = schema.literal('included');

const CommonEntrySchema = {
  field: schema.oneOf([
    schema.literal(ConditionEntryField.HASH),
    schema.literal(ConditionEntryField.PATH),
  ]),
  type: ConditionEntryTypeSchema,
  operator: ConditionEntryOperatorSchema,
  value: schema.conditional(
    schema.siblingRef('field'),
    ConditionEntryField.HASH,
    schema.string({
      validate: (hash) => (isValidHash(hash) ? undefined : `Invalid hash value [${hash}]`),
    }),
    schema.string({ minLength: 1 })
  ),
};

const WindowsEntrySchema = schema.object({
  ...CommonEntrySchema,
  field: schema.oneOf([
    schema.literal(ConditionEntryField.HASH),
    schema.literal(ConditionEntryField.PATH),
    schema.literal(ConditionEntryField.SIGNER),
  ]),
});

const LinuxEntrySchema = schema.object({
  ...CommonEntrySchema,
});

const MacEntrySchema = schema.object({
  ...CommonEntrySchema,
});

const EntriesSchema = schema.arrayOf(
  schema.conditional(
    schema.siblingRef('os'),
    OperatingSystem.WINDOWS,
    WindowsEntrySchema,
    schema.conditional(
      schema.siblingRef('os'),
      OperatingSystem.LINUX,
      LinuxEntrySchema,
      MacEntrySchema
    )
  ),
  {
    minSize: 1,
    validate(entries) {
      return (
        getDuplicateFields(entries)
          .map((field) => `[${entryFieldLabels[field]}] field can only be used once`)
          .join(', ') || undefined
      );
    },
  }
);

export const PostTrustedAppCreateRequestSchema = {
  body: schema.object({
    name: schema.string({ minLength: 1, maxLength: 256 }),
    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),
    os: schema.oneOf([
      schema.literal(OperatingSystem.WINDOWS),
      schema.literal(OperatingSystem.LINUX),
      schema.literal(OperatingSystem.MAC),
    ]),
    entries: EntriesSchema,
  }),
};
