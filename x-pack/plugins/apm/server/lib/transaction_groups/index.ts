/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StringMap } from '../../../typings/common';
import { Setup } from '../helpers/setup_request';
import { transactionGroupsFetcher } from './fetcher';
import { transactionGroupsTransformer } from './transform';

export async function getTransactionGroups(setup: Setup, bodyQuery: StringMap) {
  const { start, end } = setup;
  const response = await transactionGroupsFetcher(setup, bodyQuery);
  return transactionGroupsTransformer({
    response,
    start,
    end
  });
}
