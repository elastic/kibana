/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment';
import semverIsValid from 'semver/functions/valid';

import { RequestDiagnosticsAdditionalMetrics } from '../../../common/types';

import { SO_SEARCH_LIMIT, AGENTS_PREFIX, AGENT_MAPPINGS } from '../../constants';

import { NewAgentActionSchema } from '../models';

import { validateKuery } from '../../routes/utils/filter_utils';

export const GetAgentsRequestSchema = {
  query: schema.object(
    {
      page: schema.number({ defaultValue: 1 }),
      perPage: schema.number({ defaultValue: 20 }),
      kuery: schema.maybe(
        schema.string({
          validate: (value: string) => {
            const validationObj = validateKuery(value, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
            if (validationObj?.error) {
              return validationObj?.error;
            }
          },
        })
      ),
      showInactive: schema.boolean({ defaultValue: false }),
      withMetrics: schema.boolean({ defaultValue: false }),
      showUpgradeable: schema.boolean({ defaultValue: false }),
      getStatusSummary: schema.boolean({ defaultValue: false }),
      sortField: schema.maybe(schema.string()),
      sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
    },
    {
      validate: (request) => {
        if (request.page * request.perPage > SO_SEARCH_LIMIT) {
          return `You cannot use page and perPage page over ${SO_SEARCH_LIMIT} agents`;
        }
      },
    }
  ),
};

export const GetOneAgentRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  query: schema.object({
    withMetrics: schema.boolean({ defaultValue: false }),
  }),
};

export const PostNewAgentActionRequestSchema = {
  body: schema.object({
    action: NewAgentActionSchema,
  }),
  params: schema.object({
    agentId: schema.string(),
  }),
};

export const PostCancelActionRequestSchema = {
  params: schema.object({
    actionId: schema.string(),
  }),
};

export const PostRetrieveAgentsByActionsRequestSchema = {
  body: schema.object({
    actionIds: schema.arrayOf(schema.string()),
  }),
};

export const PostAgentUnenrollRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.maybe(schema.boolean()),
      revoke: schema.maybe(schema.boolean()),
    })
  ),
};

export const PostBulkAgentUnenrollRequestSchema = {
  body: schema.object({
    agents: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    force: schema.maybe(schema.boolean()),
    revoke: schema.maybe(schema.boolean()),
    batchSize: schema.maybe(schema.number()),
    includeInactive: schema.maybe(schema.boolean()),
  }),
};

function validateVersion(s: string) {
  if (!semverIsValid(s)) {
    return 'not a valid semver';
  }
}

export const PostAgentUpgradeRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.object({
    source_uri: schema.maybe(schema.string()),
    version: schema.string({
      validate: validateVersion,
    }),
    force: schema.maybe(schema.boolean()),
    skipRateLimitCheck: schema.maybe(schema.boolean()),
  }),
};

export const PostBulkAgentUpgradeRequestSchema = {
  body: schema.object({
    agents: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    source_uri: schema.maybe(schema.string()),
    version: schema.string({ validate: validateVersion }),
    force: schema.maybe(schema.boolean()),
    skipRateLimitCheck: schema.maybe(schema.boolean()),
    rollout_duration_seconds: schema.maybe(schema.number({ min: 600 })),
    start_time: schema.maybe(
      schema.string({
        validate: (v: string) => {
          if (!moment(v).isValid()) {
            return 'not a valid date';
          }
        },
      })
    ),
    batchSize: schema.maybe(schema.number()),
    includeInactive: schema.boolean({ defaultValue: false }),
  }),
};

export const PutAgentReassignRequestSchemaDeprecated = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.object({
    policy_id: schema.string(),
  }),
};

export const PostAgentReassignRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.object({
    policy_id: schema.string(),
  }),
};

export const PostRequestDiagnosticsActionRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.nullable(
    schema.object({
      additional_metrics: schema.maybe(
        schema.arrayOf(schema.oneOf([schema.literal(RequestDiagnosticsAdditionalMetrics.CPU)]))
      ),
    })
  ),
};

export const PostBulkRequestDiagnosticsActionRequestSchema = {
  body: schema.object({
    agents: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    batchSize: schema.maybe(schema.number()),
    additional_metrics: schema.maybe(
      schema.arrayOf(schema.oneOf([schema.literal(RequestDiagnosticsAdditionalMetrics.CPU)]))
    ),
  }),
};

export const ListAgentUploadsRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
};

export const GetAgentUploadFileRequestSchema = {
  params: schema.object({
    fileId: schema.string(),
    fileName: schema.string(),
  }),
};

export const PostBulkAgentReassignRequestSchema = {
  body: schema.object({
    policy_id: schema.string(),
    agents: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    batchSize: schema.maybe(schema.number()),
    includeInactive: schema.boolean({ defaultValue: false }),
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
    user_provided_metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    tags: schema.maybe(schema.arrayOf(schema.string())),
  }),
};

export const PostBulkUpdateAgentTagsRequestSchema = {
  body: schema.object({
    agents: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    tagsToAdd: schema.maybe(schema.arrayOf(schema.string())),
    tagsToRemove: schema.maybe(schema.arrayOf(schema.string())),
    batchSize: schema.maybe(schema.number()),
    includeInactive: schema.boolean({ defaultValue: false }),
  }),
};

export const GetAgentStatusRequestSchema = {
  query: schema.object({
    policyId: schema.maybe(schema.string()),
    kuery: schema.maybe(
      schema.string({
        validate: (value: string) => {
          const validationObj = validateKuery(value, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
          if (validationObj?.error) {
            return validationObj?.error;
          }
        },
      })
    ),
  }),
};

export const GetAgentDataRequestSchema = {
  query: schema.object({
    agentsIds: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    previewData: schema.boolean({ defaultValue: false }),
  }),
};

export const GetActionStatusRequestSchema = {
  query: schema.object({
    page: schema.number({ defaultValue: 0 }),
    perPage: schema.number({ defaultValue: 20 }),
    errorSize: schema.number({ defaultValue: 5 }),
  }),
};
