/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AGENT_CONFIG_DETAILS_PATH } from '../../../constants';

export const DETAILS_ROUTER_PATH = `${AGENT_CONFIG_DETAILS_PATH}:configId`;
export const DETAILS_ROUTER_SUB_PATH = `${DETAILS_ROUTER_PATH}/:tabId`;
