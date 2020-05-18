/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { filter, list_id, page, per_page, sort_field, sort_order } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const findExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      list_id,
    })
  ),
  t.exact(
    t.partial({
      filter, // defaults to undefined if not set during decode
      page, // defaults to undefined if not set during decode
      per_page, // defaults to undefined if not set during decode
      sort_field, // defaults to undefined if not set during decode
      sort_order, // defaults to undefined if not set during decode
    })
  ),
]);

export type FindExceptionListItemSchemaPartial = t.TypeOf<typeof findExceptionListItemSchema>;

export type FindExceptionListItemSchema = RequiredKeepUndefined<
  t.TypeOf<typeof findExceptionListItemSchema>
>;
