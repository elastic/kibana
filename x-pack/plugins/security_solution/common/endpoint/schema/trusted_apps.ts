/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

const hashLengths: readonly number[] = [
  32, // MD5
  40, // SHA1
  64, // SHA256
];
const hasInvalidCharacters = /[^0-9a-f]/i;

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
    name: schema.string({ minLength: 1 }),
    description: schema.maybe(schema.string({ minLength: 0, defaultValue: '' })),
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
              return `[Hash] field can only be used once`;
            }

            usedFields.push(field);

            if (
              field === 'process.hash.*' &&
              (!hashLengths.includes(value.length) || hasInvalidCharacters.test(value))
            ) {
              return `Invalid hash value [${value}]`;
            }
          }
        },
      }
    ),
  }),
};
