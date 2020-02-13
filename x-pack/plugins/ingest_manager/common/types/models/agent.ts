/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

export const AGENT_TYPE_PERMANENT = 'PERMANENT';
export const AGENT_TYPE_EPHEMERAL = 'EPHEMERAL';
export const AGENT_TYPE_TEMPORARY = 'TEMPORARY';

export const AGENT_POLLING_THRESHOLD_MS = 30000;
export const AGENT_POLLING_INTERVAL = 1000;

export const AgentTypeSchema = schema.oneOf([
  schema.literal(AGENT_TYPE_EPHEMERAL),
  schema.literal(AGENT_TYPE_PERMANENT),
  schema.literal(AGENT_TYPE_TEMPORARY),
]);

export type AgentType = TypeOf<typeof AgentTypeSchema>;

const AgentActionBaseSchema = {
  type: schema.oneOf([
    schema.literal('POLICY_CHANGE'),
    schema.literal('DATA_DUMP'),
    schema.literal('RESUME'),
    schema.literal('PAUSE'),
  ]),
  id: schema.string(),
  created_at: schema.string(),
  data: schema.maybe(schema.string()),
  sent_at: schema.maybe(schema.string()),
};

const AgentActionSchema = schema.object({ ...AgentActionBaseSchema });
export type AgentAction = TypeOf<typeof AgentActionSchema>;

const AgentEventBase = {
  type: schema.oneOf([
    schema.literal('STATE'),
    schema.literal('ERROR'),
    schema.literal('ACTION_RESULT'),
    schema.literal('ACTION'),
  ]),
  subtype: schema.oneOf([
    // State
    schema.literal('RUNNING'),
    schema.literal('STARTING'),
    schema.literal('IN_PROGRESS'),
    schema.literal('CONFIG'),
    schema.literal('FAILED'),
    schema.literal('STOPPING'),
    schema.literal('STOPPED'),
    // Action results
    schema.literal('DATA_DUMP'),
    // Actions
    schema.literal('ACKNOWLEDGED'),
    schema.literal('UNKNOWN'),
  ]),
  timestamp: schema.string(),
  message: schema.string(),
  payload: schema.maybe(schema.any()),
  data: schema.maybe(schema.string()),
  action_id: schema.maybe(schema.string()),
  policy_id: schema.maybe(schema.string()),
  stream_id: schema.maybe(schema.string()),
};

export const AgentEventSchema = schema.object({
  ...AgentEventBase,
});

const AgentEventSOAttributesSchema = schema.object({
  ...AgentEventBase,
});

export type AgentEvent = TypeOf<typeof AgentEventSchema>;
export type AgentEventSOAttributes = TypeOf<typeof AgentEventSOAttributesSchema>;
const AgentBaseSchema = {
  type: AgentTypeSchema,
  active: schema.boolean(),
  enrolled_at: schema.string(),
  user_provided_metadata: schema.recordOf(schema.string(), schema.string()),
  local_metadata: schema.recordOf(schema.string(), schema.string()),
  shared_id: schema.maybe(schema.string()),
  access_api_key_id: schema.maybe(schema.string()),
  default_api_key: schema.maybe(schema.string()),
  policy_id: schema.maybe(schema.string()),
  last_checkin: schema.maybe(schema.string()),
  config_updated_at: schema.maybe(schema.string()),
  actions: schema.arrayOf(AgentActionSchema),
  current_error_events: schema.arrayOf(AgentEventSchema),
};

const AgentSchema = schema.object({
  ...AgentBaseSchema,
  id: schema.string(),
  user_provided_metadata: schema.recordOf(schema.string(), schema.string()),
  local_metadata: schema.recordOf(schema.string(), schema.string()),
  access_api_key: schema.maybe(schema.string()),
  status: schema.maybe(schema.string()),
});

const AgentSOAttributesSchema = schema.object({
  ...AgentBaseSchema,
  user_provided_metadata: schema.string(),
  local_metadata: schema.string(),
  current_error_events: schema.maybe(schema.string()),
});

export type Agent = TypeOf<typeof AgentSchema>;
export type AgentSOAttributes = TypeOf<typeof AgentSOAttributesSchema>;

export type AgentStatus = 'offline' | 'error' | 'online' | 'inactive' | 'warning';
