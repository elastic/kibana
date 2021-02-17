/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { AGENT_TYPE_EPHEMERAL, AGENT_TYPE_PERMANENT, AGENT_TYPE_TEMPORARY } from '../../../common';

export const AgentTypeSchema = schema.oneOf([
  schema.literal(AGENT_TYPE_EPHEMERAL),
  schema.literal(AGENT_TYPE_PERMANENT),
  schema.literal(AGENT_TYPE_TEMPORARY),
]);

const AgentEventBase = {
  type: schema.oneOf([
    schema.literal('STATE'),
    schema.literal('ERROR'),
    schema.literal('ACTION_RESULT'),
    schema.literal('ACTION'),
  ]),
  subtype: schema.oneOf([
    // State
    schema.oneOf([
      schema.literal('RUNNING'),
      schema.literal('STARTING'),
      schema.literal('IN_PROGRESS'),
      schema.literal('CONFIG'),
      schema.literal('FAILED'),
      schema.literal('STOPPING'),
      schema.literal('STOPPED'),
      schema.literal('DEGRADED'),
      schema.literal('UPDATING'),
    ]),
    // Action results
    schema.literal('DATA_DUMP'),
    // Actions
    schema.literal('ACKNOWLEDGED'),
    schema.literal('UNKNOWN'),
  ]),
  timestamp: schema.string(),
  message: schema.string(),
  payload: schema.maybe(schema.any()),
  agent_id: schema.string(),
  action_id: schema.maybe(schema.string()),
  policy_id: schema.maybe(schema.string()),
  stream_id: schema.maybe(schema.string()),
};

export const AckEventSchema = schema.object({
  ...AgentEventBase,
  ...{ action_id: schema.string() },
});

export const NewAgentEventSchema = schema.object({
  ...AgentEventBase,
});

export const AgentEventSchema = schema.object({
  ...AgentEventBase,
  id: schema.string(),
});

export const NewAgentActionSchema = schema.oneOf([
  schema.object({
    type: schema.oneOf([
      schema.literal('POLICY_CHANGE'),
      schema.literal('UNENROLL'),
      schema.literal('UPGRADE'),
      schema.literal('INTERNAL_POLICY_REASSIGN'),
    ]),
    data: schema.maybe(schema.any()),
    ack_data: schema.maybe(schema.any()),
  }),
  schema.object({
    type: schema.oneOf([schema.literal('SETTINGS')]),
    data: schema.object({
      log_level: schema.oneOf([
        schema.literal('debug'),
        schema.literal('info'),
        schema.literal('warning'),
        schema.literal('error'),
      ]),
    }),
  }),
]);
