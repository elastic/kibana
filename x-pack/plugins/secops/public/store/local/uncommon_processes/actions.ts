/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

// TODO: This should be merged in with hosts (folder for stage 2 refactor)

const actionCreator = actionCreatorFactory('x-pack/secops/local/uncommonProcesses');

export const updateLimitOfPagination = actionCreator<{ limit: number }>('UPDATE_LIMIT');

export const updateUpperLimitOfPagination = actionCreator<{ upperLimit: number }>(
  'UPDATE_UPPER_LIMIT'
);
