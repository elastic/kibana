/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SECTIONS } from '../../constants';
import { loadAutoFollowPatterns as request } from '../../services/api';
import * as t from '../action_types';
import { apiAction } from './api';

const { AUTO_FOLLOW_PATTERN } = SECTIONS;

export const loadAutoFollowPatterns = () =>
  apiAction({
    label: t.AUTO_FOLLOW_PATTERN_LOAD,
    scope: AUTO_FOLLOW_PATTERN,
    handler: async () => {
      const data = await request();

      // We can manipulate any way we want the response
      return { ...data, isModified: true };
    },
  });
