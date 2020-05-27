/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SECTIONS } from '../../constants';
import { loadAutoFollowStats as loadAutoFollowStatsRequest } from '../../services/api';
import * as t from '../action_types';
import { sendApiRequest } from './api';

const { CCR_STATS: scope } = SECTIONS;

export const loadAutoFollowStats = () =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_STATS_LOAD,
    scope,
    handler: async () => await loadAutoFollowStatsRequest(),
  });
