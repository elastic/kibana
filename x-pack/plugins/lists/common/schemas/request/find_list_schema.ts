/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { cursor, filter, sort_field, sort_order } from '../common/schemas';
import { StringToPositiveNumber } from '../types/string_to_positive_number';

export const findListSchema = t.exact(
  t.partial({
    cursor, // defaults to undefined if not set during decode
    filter, // defaults to undefined if not set during decode
    page: StringToPositiveNumber, // defaults to undefined if not set during decode
    per_page: StringToPositiveNumber, // defaults to undefined if not set during decode
    sort_field, // defaults to undefined if not set during decode
    sort_order, // defaults to undefined if not set during decode
  })
);

export type FindListSchema = t.TypeOf<typeof findListSchema>;
export type FindListSchemaEncoded = t.OutputOf<typeof findListSchema>;
