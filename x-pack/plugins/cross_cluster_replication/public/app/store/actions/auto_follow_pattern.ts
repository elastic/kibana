/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SECTIONS } from '../../constants';
import { loadAutoFollowPatterns as request } from '../../services/api';
import { ActionsUnion, LoadAutoFollowPatternResponse } from '../../types';
import { createAction } from '../action_creator';
import * as t from '../action_types';
import { Actions as ApiActions } from './api';

const { AUTO_FOLLOW_PATTERN } = SECTIONS;
const { apiAction } = ApiActions;

export const Actions = {
  loadAutoFollowPatterns: () =>
    apiAction(t.AUTO_FOLLOW_PATTERN_LOAD, AUTO_FOLLOW_PATTERN, async () => {
      const data = await request();

      // We can manipulate any way we want the response
      return { ...data, isModified: true };
    }),
  loadAutoFollowPatternsSuccess: (response: LoadAutoFollowPatternResponse) =>
    createAction(t.AUTO_FOLLOW_PATTERN_LOAD_SUCCESS, response),
};

export type Actions = ActionsUnion<typeof Actions>;
