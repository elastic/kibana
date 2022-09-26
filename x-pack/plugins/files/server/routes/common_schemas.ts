/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const ALPHA_NUMERIC_WITH_SPACES_REGEX = /^[a-z0-9\s_]+$/i;
const ALPHA_NUMERIC_WITH_SPACES_EXT_REGEX = /^[a-z0-9\s\._]+$/i;

function alphanumericValidation(v: string) {
  return ALPHA_NUMERIC_WITH_SPACES_REGEX.test(v)
    ? undefined
    : 'Only alphanumeric characters are allowed as file names';
}

function alphanumericWithExtValidation(v: string) {
  return ALPHA_NUMERIC_WITH_SPACES_EXT_REGEX.test(v)
    ? undefined
    : 'Only alphanumeric characters, spaces (" "), dots (".") and underscores ("_") are allowed';
}

export const fileName = schema.string({
  minLength: 1,
  maxLength: 256,
  validate: alphanumericValidation,
});

export const fileNameWithExt = schema.string({
  minLength: 1,
  maxLength: 256,
  validate: alphanumericWithExtValidation,
});

export const fileAlt = schema.maybe(
  schema.string({
    minLength: 1,
    maxLength: 256,
    validate: alphanumericValidation,
  })
);

export const fileMeta = schema.maybe(schema.object({}, { unknowns: 'allow' }));
