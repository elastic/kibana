/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { list_idOrUndefined, typeOrUndefined } from '../common/schemas';

export const importListItemQuerySchema = t.exact(
  t.type({ list_id: list_idOrUndefined, type: typeOrUndefined })
);

export type ImportListItemQuerySchema = t.TypeOf<typeof importListItemQuerySchema>;
