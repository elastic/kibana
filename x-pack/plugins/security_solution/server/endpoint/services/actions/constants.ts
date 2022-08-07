/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
} from '../../../../common/endpoint/constants';
/**
 * The Page Size to be used when searching against the Actions indexes (both requests and responses)
 */
export const ACTIONS_SEARCH_PAGE_SIZE = 10000;

export const ACTION_REQUEST_INDICES = [AGENT_ACTIONS_INDEX, ENDPOINT_ACTIONS_INDEX];
// search all responses indices irrelevant of namespace
export const ACTION_RESPONSE_INDICES = [
  AGENT_ACTIONS_RESULTS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
];
