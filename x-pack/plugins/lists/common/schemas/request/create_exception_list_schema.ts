/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  _tagsOrUndefined,
  description,
  exceptionListType,
  list_id,
  metaOrUndefined,
  name,
  tagsOrUndefined,
} from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

export const createExceptionListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      list_id,
      name,
      type: exceptionListType,
    })
  ),
  t.exact(
    t.partial({
      _tags: _tagsOrUndefined,
      meta: metaOrUndefined,
      tags: tagsOrUndefined,
    })
  ),
]);

export type CreateExceptionListSchemaPartial = Identity<t.TypeOf<typeof createExceptionListSchema>>;
export type CreateExceptionListSchema = RequiredKeepUndefined<
  t.TypeOf<typeof createExceptionListSchema>
>;
