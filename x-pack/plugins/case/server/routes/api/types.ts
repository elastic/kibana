/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { NewCaseSchema, UpdatedCaseSchema } from './schema';

export type UpdatedCaseType = TypeOf<typeof UpdatedCaseSchema>;

export interface UpdatedCaseWithDate extends UpdatedCaseType {
  last_edit_date: number;
}

export type NewCaseType = TypeOf<typeof NewCaseSchema>;

export interface NewCaseWithDate extends NewCaseType {
  creation_date: number;
  last_edit_date: number;
}
