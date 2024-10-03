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
import { ListResponseSchema } from '../../routes/schema/utils';

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

export const AgentComponentStateSchema = schema.oneOf([
  schema.literal('STARTING'),
  schema.literal('CONFIGURING'),
  schema.literal('HEALTHY'),
  schema.literal('DEGRADED'),
  schema.literal('FAILED'),
  schema.literal('STOPPING'),
  schema.literal('STOPPED'),
]);
export const AgentUpgradeStateTypeSchema = schema.oneOf([
  schema.literal('UPG_REQUESTED'),
  schema.literal('UPG_SCHEDULED'),
  schema.literal('UPG_DOWNLOADING'),
  schema.literal('UPG_EXTRACTING'),
  schema.literal('UPG_REPLACING'),
  schema.literal('UPG_RESTARTING'),
  schema.literal('UPG_FAILED'),
  schema.literal('UPG_WATCHING'),
  schema.literal('UPG_ROLLBACK'),
]);
export const AgentStatusSchema = schema.oneOf([
  schema.literal('offline'),
  schema.literal('error'),
  schema.literal('online'),
  schema.literal('inactive'),
  schema.literal('enrolling'),
  schema.literal('unenrolling'),
  schema.literal('unenrolled'),
  schema.literal('updating'),
  schema.literal('degraded'),
]);

export const AgentResponseSchema = schema.object({
  id: schema.string(),
  access_api_key: schema.maybe(schema.string()),
  default_api_key_history: schema.maybe(
    schema.arrayOf(
      schema.object(
        {
          id: schema.string(),
          retired_at: schema.string(),
        },
        {
          meta: { deprecated: true },
        }
      )
    )
  ),
  outputs: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        api_key_id: schema.string(),
        type: schema.string(),
        to_retire_api_key_ids: schema.maybe(
          schema.arrayOf(
            schema.object({
              id: schema.string(),
              retired_at: schema.string(),
            })
          )
        ),
      })
    )
  ),
  status: schema.maybe(AgentStatusSchema),
  packages: schema.arrayOf(schema.string()),
  sort: schema.maybe(
    schema.arrayOf(schema.oneOf([schema.number(), schema.string(), schema.literal(null)]))
  ),
  metrics: schema.maybe(
    schema.object({
      cpu_avg: schema.maybe(schema.number()),
      memory_size_byte_avg: schema.maybe(schema.number()),
    })
  ),
  type: schema.oneOf([
    schema.literal('PERMANENT'),
    schema.literal('EPHEMERAL'),
    schema.literal('TEMPORARY'),
  ]),
  active: schema.boolean(),
  enrolled_at: schema.string(),
  unenrolled_at: schema.maybe(schema.string()),
  unenrollment_started_at: schema.maybe(schema.string()),
  upgraded_at: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  upgrade_started_at: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  upgrade_details: schema.maybe(
    schema.object({
      target_version: schema.string(),
      action_id: schema.string(),
      state: AgentUpgradeStateTypeSchema,
      metadata: schema.maybe(
        schema.object({
          scheduled_at: schema.maybe(schema.string()),
          download_percent: schema.maybe(schema.number()),
          download_rate: schema.maybe(schema.number()),
          failed_state: schema.maybe(AgentUpgradeStateTypeSchema),
          error_msg: schema.maybe(schema.string()),
          retry_error_msg: schema.maybe(schema.string()),
          retry_until: schema.maybe(schema.string()),
        })
      ),
    })
  ),
  access_api_key_id: schema.maybe(schema.string()),
  default_api_key: schema.maybe(schema.string()),
  default_api_key_id: schema.maybe(schema.string()),
  policy_id: schema.maybe(schema.string()),
  policy_revision: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
  last_checkin: schema.maybe(schema.string()),
  last_checkin_status: schema.maybe(
    schema.oneOf([
      schema.literal('error'),
      schema.literal('online'),
      schema.literal('degraded'),
      schema.literal('updating'),
      schema.literal('starting'),
    ])
  ),
  last_checkin_message: schema.maybe(schema.string()),
  user_provided_metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  local_metadata: schema.recordOf(schema.string(), schema.any()),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  components: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
        type: schema.string(),
        status: AgentComponentStateSchema,
        message: schema.string(),
        units: schema.maybe(
          schema.arrayOf(
            schema.object({
              id: schema.string(),
              type: schema.oneOf([schema.literal('input'), schema.literal('output')]),
              status: AgentComponentStateSchema,
              message: schema.string(),
              payload: schema.maybe(schema.recordOf(schema.string(), schema.any())),
            })
          )
        ),
      })
    )
  ),
  agent: schema.maybe(
    schema
      .object({
        id: schema.string(),
        version: schema.string(),
      })
      .extendsDeep({
        unknowns: 'allow',
      })
  ),
  unhealthy_reason: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.arrayOf(
        schema.oneOf([schema.literal('input'), schema.literal('output'), schema.literal('other')])
      ),
    ])
  ),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
});

export const GetAgentsResponseSchema = ListResponseSchema(AgentResponseSchema).extends({
  list: schema.maybe(
    schema.arrayOf(AgentResponseSchema, {
      meta: { deprecated: true },
    })
  ),
  statusSummary: schema.maybe(schema.recordOf(AgentStatusSchema, schema.number())),
});

export const GetAgentResponseSchema = schema.object({
  item: AgentResponseSchema,
});

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

export const PostNewAgentActionResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    type: schema.string(), // literals
    data: schema.maybe(schema.any()),
    sent_at: schema.maybe(schema.string()),
    created_at: schema.string(),
    ack_data: schema.maybe(schema.any()),
    agents: schema.arrayOf(schema.string()),
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    expiration: schema.maybe(schema.string()),
    start_time: schema.maybe(schema.string()),
    minimum_execution_duration: schema.maybe(schema.number()),
    rollout_duration_seconds: schema.maybe(schema.number()),
    source_uri: schema.maybe(schema.string()),
    total: schema.maybe(schema.number()),
  }),
});

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

export const PostRetrieveAgentsByActionsResponseSchema = schema.object({
  items: schema.arrayOf(schema.string()),
});

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
    agents: schema.oneOf([
      schema.arrayOf(
        schema.string({
          meta: {
            description: 'KQL query string, leave empty to action all agents',
          },
        })
      ),
      schema.string({
        meta: {
          description: 'list of agent IDs',
        },
      }),
    ]),
    force: schema.maybe(
      schema.boolean({
        meta: {
          description: 'Unenrolls hosted agents too',
        },
      })
    ),
    revoke: schema.maybe(
      schema.boolean({
        meta: {
          description: 'Revokes API keys of agents',
        },
      })
    ),
    batchSize: schema.maybe(schema.number()),
    includeInactive: schema.maybe(
      schema.boolean({
        meta: {
          description: 'When passing agents by KQL query, unenrolls inactive agents too',
        },
      })
    ),
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

export const ListAgentUploadsResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      id: schema.string(),
      name: schema.string(),
      filePath: schema.string(),
      createTime: schema.string(),
      status: schema.oneOf([
        schema.literal('READY'),
        schema.literal('AWAITING_UPLOAD'),
        schema.literal('DELETED'),
        schema.literal('EXPIRED'),
        schema.literal('IN_PROGRESS'),
        schema.literal('FAILED'),
      ]),
      actionId: schema.string(),
      error: schema.maybe(schema.string()),
    })
  ),
});

export const GetAgentUploadFileRequestSchema = {
  params: schema.object({
    fileId: schema.string(),
    fileName: schema.string(),
  }),
};

export const DeleteAgentUploadFileRequestSchema = {
  params: schema.object({
    fileId: schema.string(),
  }),
};

export const DeleteAgentUploadFileResponseSchema = schema.object({
  id: schema.string(),
  deleted: schema.boolean(),
});

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

export const DeleteAgentResponseSchema = schema.object({
  action: schema.literal('deleted'),
});

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

export const PostBulkActionResponseSchema = schema.object({
  actionId: schema.string(),
});

export const GetAgentStatusRequestSchema = {
  query: schema.object({
    policyId: schema.maybe(schema.string()),
    policyIds: schema.maybe(schema.oneOf([schema.arrayOf(schema.string()), schema.string()])),
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

export const GetAgentStatusResponseSchema = schema.object({
  results: schema.object({
    events: schema.number(),
    total: schema.number({
      meta: {
        deprecated: true,
      },
    }),
    online: schema.number(),
    error: schema.number(),
    offline: schema.number(),
    other: schema.number(),
    updating: schema.number(),
    inactive: schema.number(),
    unenrolled: schema.number(),
    all: schema.number(),
    active: schema.number(),
  }),
});

export const GetAgentDataRequestSchema = {
  query: schema.object({
    agentsIds: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
    previewData: schema.boolean({ defaultValue: false }),
  }),
};

export const GetAgentDataResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.recordOf(
      schema.string(),
      schema.object({
        data: schema.boolean(),
      })
    )
  ),
  dataPreview: schema.arrayOf(schema.any()),
});

export const GetActionStatusRequestSchema = {
  query: schema.object({
    page: schema.number({ defaultValue: 0 }),
    perPage: schema.number({ defaultValue: 20 }),
    date: schema.maybe(
      schema.string({
        validate: (v: string) => {
          if (!moment(v).isValid()) {
            return 'not a valid date';
          }
        },
      })
    ),
    latest: schema.maybe(schema.number()),
    errorSize: schema.number({ defaultValue: 5 }),
  }),
};

export const GetActionStatusResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      actionId: schema.string(),
      nbAgentsActionCreated: schema.number({
        meta: {
          description: 'number of agents included in action from kibana',
        },
      }),
      nbAgentsAck: schema.number({
        meta: {
          description: 'number of agents that acknowledged the action',
        },
      }),
      nbAgentsFailed: schema.number({
        meta: {
          description: 'number of agents that failed to execute the action',
        },
      }),
      version: schema.maybe(
        schema.string({
          meta: {
            description: 'agent version number (UPGRADE action)',
          },
        })
      ),
      startTime: schema.maybe(
        schema.string({
          meta: {
            description: 'start time of action (scheduled actions)',
          },
        })
      ),
      type: schema.oneOf([
        schema.literal('UPGRADE'),
        schema.literal('UNENROLL'),
        schema.literal('SETTINGS'),
        schema.literal('POLICY_REASSIGN'),
        schema.literal('CANCEL'),
        schema.literal('FORCE_UNENROLL'),
        schema.literal('REQUEST_DIAGNOSTICS'),
        schema.literal('UPDATE_TAGS'),
        schema.literal('POLICY_CHANGE'),
        schema.literal('INPUT_ACTION'),
      ]),
      nbAgentsActioned: schema.number({
        meta: {
          description: 'number of agents actioned',
        },
      }),
      status: schema.oneOf([
        schema.literal('COMPLETE'),
        schema.literal('EXPIRED'),
        schema.literal('CANCELLED'),
        schema.literal('FAILED'),
        schema.literal('IN_PROGRESS'),
        schema.literal('ROLLOUT_PASSED'),
      ]),
      expiration: schema.maybe(schema.string()),
      completionTime: schema.maybe(schema.string()),
      cancellationTime: schema.maybe(schema.string()),
      newPolicyId: schema.maybe(
        schema.string({
          meta: {
            description: 'new policy id (POLICY_REASSIGN action)',
          },
        })
      ),
      creationTime: schema.string({
        meta: {
          description: 'creation time of action',
        },
      }),
      hasRolloutPeriod: schema.maybe(schema.boolean()),
      latestErrors: schema.maybe(
        schema.arrayOf(
          schema.object(
            {
              agentId: schema.string(),
              error: schema.string(),
              timestamp: schema.string(),
              hostname: schema.maybe(schema.string()),
            },
            {
              meta: {
                description: 'latest errors that happened when the agents executed the action',
              },
            }
          )
        )
      ),
      revision: schema.maybe(
        schema.number({
          meta: {
            description: 'new policy revision (POLICY_CHANGE action)',
          },
        })
      ),
      policyId: schema.maybe(
        schema.string({
          meta: {
            description: 'policy id (POLICY_CHANGE action)',
          },
        })
      ),
    })
  ),
});

export const GetAvailableAgentVersionsResponseSchema = schema.object({
  items: schema.arrayOf(schema.string()),
});
