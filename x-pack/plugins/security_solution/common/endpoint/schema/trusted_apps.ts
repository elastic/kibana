/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, Type } from '@kbn/config-schema';
import { ConditionEntry, ConditionEntryField, OperatingSystem } from '../types';

const HASH_LENGTHS: readonly number[] = [
  32, // MD5
  40, // SHA1
  64, // SHA256
];
const INVALID_CHARACTERS_PATTERN = /[^0-9a-f]/i;

const entryFieldLabels: { [k in ConditionEntryField]: string } = {
  [ConditionEntryField.HASH]: 'Hash',
  [ConditionEntryField.PATH]: 'Path',
  [ConditionEntryField.SIGNER]: 'Signer',
};

const isValidHash = (value: string) =>
  HASH_LENGTHS.includes(value.length) && !INVALID_CHARACTERS_PATTERN.test(value);

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

const createNewTrustedAppForOsScheme = <O extends OperatingSystem, F extends ConditionEntryField>(
  osSchema: Type<O>,
  fieldSchema: Type<F>
) =>
  schema.object({
    name: schema.string({ minLength: 1, maxLength: 256 }),
    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),
    os: osSchema,
    entries: schema.arrayOf(
      schema.object({
        field: fieldSchema,
        type: schema.literal('match'),
        operator: schema.literal('included'),
        value: schema.string({ minLength: 1 }),
      }),
      {
        minSize: 1,
        validate(entries) {
          const usedFields = new Set();

          for (const entry of entries) {
            // unfortunately combination of generics and Type<...> for "field" causes type errors
            const { field, value } = entry as ConditionEntry;

            if (usedFields.has(field)) {
              return `[${entryFieldLabels[field]}] field can only be used once`;
            }

            usedFields.add(field);

            if (field === ConditionEntryField.HASH && !isValidHash(value)) {
              return `Invalid hash value [${value}]`;
            }
          }
        },
      }
    ),
  });

export const PostTrustedAppCreateRequestSchema = {
  body: schema.oneOf([
    createNewTrustedAppForOsScheme(
      schema.oneOf([schema.literal(OperatingSystem.LINUX), schema.literal(OperatingSystem.MAC)]),
      schema.oneOf([
        schema.literal(ConditionEntryField.HASH),
        schema.literal(ConditionEntryField.PATH),
      ])
    ),
    createNewTrustedAppForOsScheme(
      schema.literal(OperatingSystem.WINDOWS),
      schema.oneOf([
        schema.literal(ConditionEntryField.HASH),
        schema.literal(ConditionEntryField.PATH),
        schema.literal(ConditionEntryField.SIGNER),
      ])
    ),
  ]),
};
