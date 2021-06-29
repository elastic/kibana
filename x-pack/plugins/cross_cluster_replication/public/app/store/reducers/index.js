/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import { reducer as api } from './api';
import { reducer as autoFollowPattern } from './auto_follow_pattern';
import { reducer as followerIndex } from './follower_index';
import { reducer as stats } from './stats';

export const ccr = combineReducers({
  autoFollowPattern,
  followerIndex,
  api,
  stats,
});
