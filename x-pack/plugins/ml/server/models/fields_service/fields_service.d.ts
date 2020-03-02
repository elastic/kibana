/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'src/core/server';

export function fieldsServiceProvider(
  callAsCurrentUser: APICaller
): {
  getCardinalityOfFields: (
    index: string[] | string,
    fieldNames: string[],
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number
  ) => Promise<any>;
  getTimeFieldRange: (index: string[] | string, timeFieldName: string, query: any) => Promise<any>;
};
