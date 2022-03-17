/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import { TrustedAppConditionEntry } from '../types';
import { getDuplicateFields, isValidHash } from '../service/trusted_apps/validations';

export const DeleteTrustedAppsRequestSchema = {
  params: schema.object({
    id: schema.string(),
  }),
};

export const GetOneTrustedAppRequestSchema = {
  params: schema.object({
    id: schema.string(),
  }),
};

export const GetTrustedAppsRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
    per_page: schema.maybe(schema.number({ defaultValue: 20, min: 1 })),
    kuery: schema.maybe(schema.string()),
  }),
};

export const GetTrustedAppsSummaryRequestSchema = {
  query: schema.object({
    kuery: schema.maybe(schema.string()),
  }),
};

const ConditionEntryTypeSchema = schema.conditional(
  schema.siblingRef('field'),
  ConditionEntryField.PATH,
  schema.oneOf([schema.literal('match'), schema.literal('wildcard')]),
  schema.literal('match')
);
const ConditionEntryOperatorSchema = schema.literal('included');

/*
 * A generic Entry schema to be used for a specific entry schema depending on the OS
 */
const CommonEntrySchema = {
  field: schema.oneOf([
    schema.literal(ConditionEntryField.HASH),
    schema.literal(ConditionEntryField.PATH),
  ]),
  type: ConditionEntryTypeSchema,
  operator: ConditionEntryOperatorSchema,
  // If field === HASH then validate hash with custom method, else validate string with minLength = 1
  value: schema.conditional(
    schema.siblingRef('field'),
    ConditionEntryField.HASH,
    schema.string({
      validate: (hash: string) =>
        isValidHash(hash) ? undefined : `invalidField.${ConditionEntryField.HASH}`,
    }),
    schema.conditional(
      schema.siblingRef('field'),
      ConditionEntryField.PATH,
      schema.string({
        validate: (field: string) =>
          field.length > 0 ? undefined : `invalidField.${ConditionEntryField.PATH}`,
      }),
      schema.string({
        validate: (field: string) =>
          field.length > 0 ? undefined : `invalidField.${ConditionEntryField.SIGNER}`,
      })
    )
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

const entriesSchemaOptions = {
  minSize: 1,
  validate(entries: TrustedAppConditionEntry[]) {
    return (
      getDuplicateFields(entries)
        .map((field) => `duplicatedEntry.${field}`)
        .join(', ') || undefined
    );
  },
};

/*
 * Entities array schema depending on Os type using schema.conditional.
 * If OS === WINDOWS then use Windows schema,
 * else if OS === LINUX then use Linux schema,
 * else use Mac schema
 *
 * The validate function checks there is no duplicated entry inside the array
 */
const EntriesSchema = schema.conditional(
  schema.siblingRef('os'),
  OperatingSystem.WINDOWS,
  schema.arrayOf(WindowsEntrySchema, entriesSchemaOptions),
  schema.conditional(
    schema.siblingRef('os'),
    OperatingSystem.LINUX,
    schema.arrayOf(LinuxEntrySchema, entriesSchemaOptions),
    schema.arrayOf(MacEntrySchema, entriesSchemaOptions)
  )
);

const getTrustedAppForOsScheme = () =>
  schema.object({
    name: schema.string({ minLength: 1, maxLength: 256 }),
    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),
    os: schema.oneOf([
      schema.literal(OperatingSystem.WINDOWS),
      schema.literal(OperatingSystem.LINUX),
      schema.literal(OperatingSystem.MAC),
    ]),
    effectScope: schema.oneOf([
      schema.object({
        type: schema.literal('global'),
      }),
      schema.object({
        type: schema.literal('policy'),
        policies: schema.arrayOf(schema.string({ minLength: 1 })),
      }),
    ]),
    entries: EntriesSchema,
    version: schema.maybe(schema.string()),
  });

export const PostTrustedAppCreateRequestSchema = {
  body: getTrustedAppForOsScheme(),
};

export const PutTrustedAppUpdateRequestSchema = {
  params: schema.object({
    id: schema.string(),
  }),
  body: getTrustedAppForOsScheme(),
};
