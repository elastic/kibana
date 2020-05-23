/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { idOrUndefined, list_idOrUndefined, valueOrUndefined } from '../common/schemas';

export const readListItemSchema = t.exact(
  t.type({ id: idOrUndefined, list_id: list_idOrUndefined, value: valueOrUndefined })
);

export type ReadListItemSchema = t.TypeOf<typeof readListItemSchema>;
