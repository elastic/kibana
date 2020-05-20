/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, list_id } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const readExceptionListSchema = t.partial({
  id,
  list_id,
});

export type ReadExceptionListSchemaPartial = t.TypeOf<typeof readExceptionListSchema>;
export type ReadExceptionListSchema = RequiredKeepUndefined<ReadExceptionListSchemaPartial>;
