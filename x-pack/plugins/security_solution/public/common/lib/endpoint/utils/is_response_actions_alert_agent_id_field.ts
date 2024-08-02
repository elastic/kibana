/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD } from '../../../../../common/endpoint/service/response_actions/constants';

const SUPPORTED_ALERT_FIELDS: Readonly<string[]> = Object.values(
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD
);

/**
 * Checks to see if a given alert field (ex. `agent.id`) is used by Agents that have support for response actions.
 */
export const isResponseActionsAlertAgentIdField = (field: string): boolean => {
  return SUPPORTED_ALERT_FIELDS.includes(field);
};
