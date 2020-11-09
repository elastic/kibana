/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { description, deserializer, id, meta, name, serializer, type } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';
import { DefaultVersionNumber, DefaultVersionNumberDecoded } from '../../shared_imports';

export const createListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type,
    })
  ),
  t.exact(
    t.partial({
      deserializer, // defaults to undefined if not set during decode
      id, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
      serializer, // defaults to undefined if not set during decode
      version: DefaultVersionNumber, // defaults to a numerical 1 if not set during decode
    })
  ),
]);

export type CreateListSchema = t.OutputOf<typeof createListSchema>;
export type CreateListSchemaDecoded = RequiredKeepUndefined<
  Omit<t.TypeOf<typeof createListSchema>, 'version'>
> & { version: DefaultVersionNumberDecoded };
