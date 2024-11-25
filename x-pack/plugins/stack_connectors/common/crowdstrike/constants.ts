/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CROWDSTRIKE_TITLE = 'CrowdStrike';
export const CROWDSTRIKE_CONNECTOR_ID = '.crowdstrike';
export const API_MAX_RESULTS = 1000;

export enum SUB_ACTION {
  GET_AGENT_DETAILS = 'getAgentDetails',
  HOST_ACTIONS = 'hostActions',
  GET_AGENT_ONLINE_STATUS = 'getAgentOnlineStatus',
  EXECUTE_RTR_COMMAND = 'executeRTRCommand',
}
