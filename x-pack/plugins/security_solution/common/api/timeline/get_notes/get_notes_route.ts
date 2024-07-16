/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';
import { unionWithNullType } from '../../../utility_types';

export const getNotesSchema = runtimeTypes.partial({
  documentIds: runtimeTypes.union([runtimeTypes.array(runtimeTypes.string), runtimeTypes.string]),
  page: unionWithNullType(runtimeTypes.number),
  perPage: unionWithNullType(runtimeTypes.number),
  search: unionWithNullType(runtimeTypes.string),
  sortField: unionWithNullType(runtimeTypes.string),
  sortOrder: unionWithNullType(runtimeTypes.string),
  filter: unionWithNullType(runtimeTypes.string),
});
