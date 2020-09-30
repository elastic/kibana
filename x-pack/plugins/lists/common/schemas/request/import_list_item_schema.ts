/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { file } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const importListItemSchema = t.exact(
  t.type({
    file,
  })
);

export type ImportListItemSchema = RequiredKeepUndefined<t.TypeOf<typeof importListItemSchema>>;
export type ImportListItemSchemaEncoded = t.OutputOf<typeof importListItemSchema>;
