/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IApiToken } from '../types';

export const apiTokenSort = (apiTokenA: IApiToken, apiTokenB: IApiToken): number => {
  if (!apiTokenA.id) {
    return -1;
  }
  if (!apiTokenB.id) {
    return 1;
  }
  return apiTokenA.id - apiTokenB.id;
};
