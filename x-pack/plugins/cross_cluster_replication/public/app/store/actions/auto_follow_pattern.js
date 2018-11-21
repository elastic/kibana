/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SECTIONS } from '../../constants';
import { loadAutoFollowPatterns as loadAutoFollowPatternsRequest } from '../../services/api';
import * as t from '../action_types';
import { apiAction } from './api';

const { AUTO_FOLLOW_PATTERN } = SECTIONS;

export const loadAutoFollowPatterns = (inBackground = false) =>
  apiAction({
    label: t.AUTO_FOLLOW_PATTERN_LOAD,
    scope: AUTO_FOLLOW_PATTERN,
    inBackground,
    handler: async () => {
      return await loadAutoFollowPatternsRequest();
    },
  });
