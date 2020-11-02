/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { TrustedApp } from '../types';

const hashLengths: readonly number[] = [
  32, // MD5
  40, // SHA1
  64, // SHA256
];
const hasInvalidCharacters = /[^0-9a-f]/i;

const entryFieldLabels: { [k in TrustedApp['entries'][0]['field']]: string } = {
  'process.hash.*': 'Hash',
  'process.executable.caseless': 'Path',
  'process.code_signature': 'Signer',
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

export const PostTrustedAppCreateRequestSchema = {
  body: schema.object({
    name: schema.string({ minLength: 1, maxLength: 256 }),
    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),
    os: schema.oneOf([schema.literal('linux'), schema.literal('macos'), schema.literal('windows')]),
    entries: schema.arrayOf(
      schema.object({
        field: schema.oneOf([
          schema.literal('process.hash.*'),
          schema.literal('process.executable.caseless'),
        ]),
        type: schema.literal('match'),
        operator: schema.literal('included'),
        value: schema.string({ minLength: 1 }),
      }),
      {
        minSize: 1,
        validate(entries) {
          const usedFields: string[] = [];
          for (const { field, value } of entries) {
            if (usedFields.includes(field)) {
              return `[${entryFieldLabels[field]}] field can only be used once`;
            }

            usedFields.push(field);

            if (field === 'process.hash.*') {
              const trimmedValue = value.trim();

              if (
                !hashLengths.includes(trimmedValue.length) ||
                hasInvalidCharacters.test(trimmedValue)
              ) {
                return `Invalid hash value [${value}]`;
              }
            }
          }
        },
      }
    ),
  }),
};
