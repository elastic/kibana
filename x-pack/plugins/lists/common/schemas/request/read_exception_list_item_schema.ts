/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, item_id } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const readExceptionListItemSchema = t.partial({
  id,
  item_id,
});

export type ReadExceptionListItemSchemaPartial = t.TypeOf<typeof readExceptionListItemSchema>;
export type ReadExceptionListItemSchema = RequiredKeepUndefined<ReadExceptionListItemSchemaPartial>;
