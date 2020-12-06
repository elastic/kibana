/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { id } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const deleteListSchema = t.exact(
  t.type({
    id,
  })
);

export type DeleteListSchema = RequiredKeepUndefined<t.TypeOf<typeof deleteListSchema>>;
export type DeleteListSchemaEncoded = t.OutputOf<typeof deleteListSchema>;
