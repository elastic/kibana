/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { metaOrUndefined, updated_at, updated_by } from '@kbn/securitysolution-io-ts-list-types';

import { esDataTypeUnion } from '../common/schemas';

export const updateEsListItemSchema = t.intersection([
  t.exact(
    t.type({
      meta: metaOrUndefined,
      updated_at,
      updated_by,
    })
  ),
  esDataTypeUnion,
]);

export type UpdateEsListItemSchema = t.OutputOf<typeof updateEsListItemSchema>;
