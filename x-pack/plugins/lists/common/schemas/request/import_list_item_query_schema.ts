/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { deserializer, list_id, serializer, type } from '../common/schemas';
import { Identity } from '../../types';

export const importListItemQuerySchema = t.exact(
  t.partial({ deserializer, list_id, serializer, type })
);

export type ImportListItemQuerySchemaPartial = Identity<t.TypeOf<typeof importListItemQuerySchema>>;

export type ImportListItemQuerySchema = t.TypeOf<typeof importListItemQuerySchema>;
export type ImportListItemQuerySchemaEncoded = t.OutputOf<typeof importListItemQuerySchema>;
