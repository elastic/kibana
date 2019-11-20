/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify, isBoom } from 'boom';
import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';
import { NewCaseWithDate, NewCaseType, UpdatedCaseWithDate, UpdatedCaseType } from './types';

// we have to use any here because the SavedObjectAttributes interface is like below
// export interface SavedObjectAttributes {
//   [key: string]: SavedObjectAttributes | string | number | boolean | null;
// }
// then this interface does not allow types without index signature
// this is limiting us with our type for now so the easy way was to use any
export const dateNewCase = (newCase: NewCaseType): NewCaseWithDate => ({
  creation_date: new Date().valueOf(),
  last_edit_date: new Date().valueOf(),
  reporter: {
    id: 'user-3333',
    name: 'Gayle Gergich',
  },
  ...newCase,
});

export const dateUpdatedCase = (updateCase: UpdatedCaseType): UpdatedCaseWithDate => ({
  last_edit_date: new Date().valueOf(),
  ...updateCase,
});

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = isBoom(error) ? error : boomify(error);
  return {
    body: boom,
    headers: boom.output.headers,
    statusCode: boom.output.statusCode,
  };
}
