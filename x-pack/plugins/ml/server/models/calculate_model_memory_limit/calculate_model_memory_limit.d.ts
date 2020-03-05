/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'src/core/server';

export function calculateModelMemoryLimitProvider(
  callAsCurrentUser: APICaller
): (
  indexPattern: string,
  splitFieldName: string,
  query: any,
  fieldNames: any,
  influencerNames: any, // string[] ?
  timeFieldName: string,
  earliestMs: number,
  latestMs: number
) => Promise<any>;
