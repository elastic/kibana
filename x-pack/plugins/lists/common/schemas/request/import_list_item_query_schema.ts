/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { type } from '@kbn/securitysolution-io-ts-utils';

import { RequiredKeepUndefined } from '../../types';
import { deserializer, list_id, serializer } from '../common/schemas';

export const importListItemQuerySchema = t.exact(
  t.partial({ deserializer, list_id, serializer, type })
);

export type ImportListItemQuerySchema = RequiredKeepUndefined<
  t.TypeOf<typeof importListItemQuerySchema>
>;
export type ImportListItemQuerySchemaEncoded = t.OutputOf<typeof importListItemQuerySchema>;
