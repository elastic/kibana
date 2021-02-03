/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, Type } from '@kbn/config-schema';
import { ConditionEntry, ConditionEntryField, OperatingSystem } from '../types';
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
const HashConditionEntrySchema = schema.object({
  field: schema.literal(ConditionEntryField.HASH),
  type: ConditionEntryTypeSchema,
  operator: ConditionEntryOperatorSchema,
  value: schema.string({
    validate: (hash) => (isValidHash(hash) ? undefined : `Invalid hash value [${hash}]`),
  }),
});
const PathConditionEntrySchema = schema.object({
  field: schema.literal(ConditionEntryField.PATH),
  type: ConditionEntryTypeSchema,
  operator: ConditionEntryOperatorSchema,
  value: schema.string({ minLength: 1 }),
});
const SignerConditionEntrySchema = schema.object({
  field: schema.literal(ConditionEntryField.SIGNER),
  type: ConditionEntryTypeSchema,
  operator: ConditionEntryOperatorSchema,
  value: schema.string({ minLength: 1 }),
});

const createNewTrustedAppForOsScheme = <O extends OperatingSystem, E extends ConditionEntry>(
  osSchema: Type<O>,
  entriesSchema: Type<E>
) =>
  schema.object({
    name: schema.string({ minLength: 1, maxLength: 256 }),
    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),
    os: osSchema,
    entries: schema.arrayOf(entriesSchema, {
      minSize: 1,
      validate(entries) {
        return (
          getDuplicateFields(entries)
            .map((field) => `[${entryFieldLabels[field]}] field can only be used once`)
            .join(', ') || undefined
        );
      },
    }),
  });

export const PostTrustedAppCreateRequestSchema = {
  body: schema.oneOf([
    createNewTrustedAppForOsScheme(
      schema.oneOf([schema.literal(OperatingSystem.LINUX), schema.literal(OperatingSystem.MAC)]),
      schema.oneOf([HashConditionEntrySchema, PathConditionEntrySchema])
    ),
    createNewTrustedAppForOsScheme(
      schema.literal(OperatingSystem.WINDOWS),
      schema.oneOf([HashConditionEntrySchema, PathConditionEntrySchema, SignerConditionEntrySchema])
    ),
  ]),
};
