/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { id, meta } from '@kbn/securitysolution-io-ts-utils';

import { _version, value } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const updateListItemSchema = t.intersection([
  t.exact(
    t.type({
      id,
      value,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
    })
  ),
]);

export type UpdateListItemSchema = t.OutputOf<typeof updateListItemSchema>;
export type UpdateListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof updateListItemSchema>
>;
