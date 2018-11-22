/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SECTIONS, API_STATUS } from '../../constants';
import { loadAutoFollowPatterns as loadAutoFollowPatternsRequest } from '../../services/api';
import * as t from '../action_types';
import { apiAction } from './api';

const { AUTO_FOLLOW_PATTERN } = SECTIONS;

export const loadAutoFollowPatterns = (isUpdating = false) =>
  apiAction({
    label: t.AUTO_FOLLOW_PATTERN_LOAD,
    scope: AUTO_FOLLOW_PATTERN,
    status: isUpdating ? API_STATUS.UPDATING : API_STATUS.LOADING,
    handler: async () => {
      return await loadAutoFollowPatternsRequest();
    },
  });
