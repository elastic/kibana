/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { NewAgentActionSchema } from '../models';

export const GetAgentsRequestSchema = {
  query: schema.object({
    page: schema.number({ defaultValue: 1 }),
    perPage: schema.number({ defaultValue: 20 }),
    kuery: schema.maybe(schema.string()),
    showInactive: schema.boolean({ defaultValue: false }),
    showUpgradeable: schema.boolean({ defaultValue: false }),
  }),
};

export const GetOneAgentRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
};

export const PostAgentCheckinRequestParamsJSONSchema = {
  type: 'object',
  properties: {
    agentId: { type: 'string' },
  },
  required: ['agentId'],
};

export const PostAgentCheckinRequestBodyJSONSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['online', 'error', 'degraded'] },
    local_metadata: {
      additionalProperties: {
        anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'object' }],
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['STATE', 'ERROR', 'ACTION_RESULT', 'ACTION'] },
          subtype: {
            type: 'string',
            enum: [
              'RUNNING',
              'STARTING',
              'IN_PROGRESS',
              'CONFIG',
              'FAILED',
              'STOPPING',
              'STOPPED',
              'DEGRADED',
              'DATA_DUMP',
              'ACKNOWLEDGED',
              'UPDATING',
              'UNKNOWN',
            ],
          },
          timestamp: { type: 'string' },
          message: { type: 'string' },
          payload: { type: 'object', additionalProperties: true },
          agent_id: { type: 'string' },
          action_id: { type: 'string' },
          policy_id: { type: 'string' },
          stream_id: { type: 'string' },
        },
        required: ['type', 'subtype', 'timestamp', 'message', 'agent_id'],
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const PostAgentEnrollRequestBodyJSONSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['EPHEMERAL', 'PERMANENT', 'TEMPORARY'] },
    shared_id: { type: 'string' },
    metadata: {
      type: 'object',
      properties: {
        local: {
          type: 'object',
          additionalProperties: true,
        },
        user_provided: {
          type: 'object',
          additionalProperties: true,
        },
      },
      additionalProperties: false,
      required: ['local', 'user_provided'],
    },
  },
  additionalProperties: false,
  required: ['type', 'metadata'],
};

export const PostAgentAcksRequestParamsJSONSchema = {
  type: 'object',
  properties: {
    agentId: { type: 'string' },
  },
  required: ['agentId'],
};

export const PostAgentAcksRequestBodyJSONSchema = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      item: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['STATE', 'ERROR', 'ACTION_RESULT', 'ACTION'] },
          subtype: {
            type: 'string',
            enum: [
              'RUNNING',
              'STARTING',
              'IN_PROGRESS',
              'CONFIG',
              'FAILED',
              'STOPPING',
              'STOPPED',
              'DEGRADED',
              'DATA_DUMP',
              'ACKNOWLEDGED',
              'UNKNOWN',
            ],
          },
          timestamp: { type: 'string' },
          message: { type: 'string' },
          payload: { type: 'object', additionalProperties: true },
          agent_id: { type: 'string' },
          action_id: { type: 'string' },
          policy_id: { type: 'string' },
          stream_id: { type: 'string' },
        },
        required: ['type', 'subtype', 'timestamp', 'message', 'agent_id', 'action_id'],
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
  required: ['events'],
};

export const PostNewAgentActionRequestSchema = {
  body: schema.object({
    action: NewAgentActionSchema,
  }),
  params: schema.object({
    agentId: schema.string(),
  }),
};

export const PostAgentUnenrollRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean(),
    })
  ),
};

export const PostBulkAgentUnenrollRequestSchema = {
  body: schema.object({
    agents: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    force: schema.maybe(schema.boolean()),
  }),
};

export const PostAgentUpgradeRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.object({
    source_uri: schema.maybe(schema.string()),
    version: schema.string(),
    force: schema.maybe(schema.boolean()),
  }),
};

export const PostBulkAgentUpgradeRequestSchema = {
  body: schema.object({
    agents: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    source_uri: schema.maybe(schema.string()),
    version: schema.string(),
    force: schema.maybe(schema.boolean()),
  }),
};

export const PutAgentReassignRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.object({
    policy_id: schema.string(),
  }),
};

export const PostBulkAgentReassignRequestSchema = {
  body: schema.object({
    policy_id: schema.string(),
    agents: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
  }),
};

export const GetOneAgentEventsRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  query: schema.object({
    page: schema.number({ defaultValue: 1 }),
    perPage: schema.number({ defaultValue: 20 }),
    kuery: schema.maybe(schema.string()),
  }),
};

export const DeleteAgentRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
};

export const UpdateAgentRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.object({
    user_provided_metadata: schema.recordOf(schema.string(), schema.any()),
  }),
};

export const GetAgentStatusRequestSchema = {
  query: schema.object({
    policyId: schema.maybe(schema.string()),
  }),
};
