/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { GlobalDataTag } from '../../../common/types';

import { agentPolicyStatuses, dataTypes } from '../../../common/constants';
import { isValidNamespace } from '../../../common/services';
import { getSettingsAPISchema } from '../../services/form_settings';

import { PackagePolicySchema } from './package_policy';

export const AgentPolicyNamespaceSchema = schema.string({
  minLength: 1,
  validate: (value) => {
    const namespaceValidation = isValidNamespace(value || '');
    if (!namespaceValidation.valid && namespaceValidation.error) {
      return namespaceValidation.error;
    }
  },
});

function validateNonEmptyString(val: string) {
  if (val.trim() === '') {
    return 'Invalid empty string';
  }
}

const TWO_WEEKS_SECONDS = 1209600;

function isInteger(n: number) {
  if (!Number.isInteger(n)) {
    return `${n} is not a valid integer`;
  }
}

export const AgentPolicyBaseSchema = {
  id: schema.maybe(schema.string()),
  space_ids: schema.maybe(schema.arrayOf(schema.string())),
  name: schema.string({ minLength: 1, validate: validateNonEmptyString }),
  namespace: AgentPolicyNamespaceSchema,
  description: schema.maybe(schema.string()),
  is_managed: schema.maybe(schema.boolean()),
  has_fleet_server: schema.maybe(schema.boolean()),
  is_default: schema.maybe(schema.boolean()),
  is_default_fleet_server: schema.maybe(schema.boolean()),
  unenroll_timeout: schema.maybe(schema.number({ min: 0, validate: isInteger })),
  inactivity_timeout: schema.number({
    min: 0,
    defaultValue: TWO_WEEKS_SECONDS,
    validate: isInteger,
  }),
  monitoring_enabled: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(dataTypes.Logs),
        schema.literal(dataTypes.Metrics),
        schema.literal(dataTypes.Traces),
      ])
    )
  ),
  keep_monitoring_alive: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.boolean({
        defaultValue: false,
        meta: {
          description:
            'When set to true, monitoring will be enabled but logs/metrics collection will be disabled',
        },
      }),
    ])
  ),
  data_output_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  monitoring_output_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  download_source_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  fleet_server_host_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  agent_features: schema.maybe(
    schema.arrayOf(
      schema.object({
        name: schema.string(),
        enabled: schema.boolean(),
      })
    )
  ),
  is_protected: schema.maybe(schema.boolean()),
  overrides: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.recordOf(schema.string(), schema.any(), {
        validate: (val) => {
          if (Object.keys(val).some((key) => key.match(/^inputs(\.)?/))) {
            return 'inputs overrides is not allowed';
          }
        },
        meta: {
          description:
            'Override settings that are defined in the agent policy. Input settings cannot be overridden. The override option should be used only in unusual circumstances and not as a routine procedure.',
        },
      }),
    ])
  ),
  ...getSettingsAPISchema('AGENT_POLICY_ADVANCED_SETTINGS'),
  supports_agentless: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'Indicates whether the agent policy supports agentless integrations.',
        },
      }),
    ])
  ),
  global_data_tags: schema.maybe(
    schema.arrayOf(
      schema.object({
        name: schema.string(),
        value: schema.oneOf([schema.string(), schema.number()]),
      }),
      {
        validate: validateGlobalDataTagInput,
        meta: {
          description:
            'User defined data tags that are added to all of the inputs. The values can be strings or numbers.',
        },
      }
    )
  ),
  monitoring_pprof_enabled: schema.maybe(schema.boolean()),
  monitoring_http: schema.maybe(
    schema.object({
      enabled: schema.boolean(),
      host: schema.maybe(schema.string({ defaultValue: 'localhost' })),
      port: schema.maybe(schema.number({ min: 0, max: 65353, defaultValue: 6791 })),
      buffer: schema.maybe(schema.object({ enabled: schema.boolean({ defaultValue: false }) })),
    })
  ),
  monitoring_diagnostics: schema.maybe(
    schema.object({
      limit: schema.maybe(
        schema.object({
          interval: schema.maybe(schema.string()),
          burst: schema.maybe(schema.number()),
        })
      ),
      uploader: schema.maybe(
        schema.object({
          max_retries: schema.maybe(schema.number()),
          init_dur: schema.maybe(schema.string()),
          max_dur: schema.maybe(schema.string()),
        })
      ),
    })
  ),
};

function validateGlobalDataTagInput(tags: GlobalDataTag[]): string | undefined {
  const seen = new Set<string>([]);
  const duplicates: string[] = [];
  const namesWithSpaces: string[] = [];
  const errors: string[] = [];

  for (const tag of tags) {
    if (/\s/.test(tag.name)) {
      namesWithSpaces.push(`'${tag.name}'`);
    }

    if (!seen.has(tag.name.trim())) {
      seen.add(tag.name.trim());
    } else {
      duplicates.push(`'${tag.name.trim()}'`);
    }
  }

  if (duplicates.length !== 0) {
    errors.push(
      `Found duplicate tag names: [${duplicates.join(', ')}], duplicate tag names are not allowed.`
    );
  }
  if (namesWithSpaces.length !== 0) {
    errors.push(
      `Found tag names with spaces: [${namesWithSpaces.join(
        ', '
      )}], tag names with spaces are not allowed.`
    );
  }

  if (errors.length !== 0) {
    return errors.join(' ');
  }
}

export const NewAgentPolicySchema = schema.object({
  ...AgentPolicyBaseSchema,
  force: schema.maybe(schema.boolean()),
});

export const AgentPolicySchema = schema.object({
  ...AgentPolicyBaseSchema,
  id: schema.string(),
  is_managed: schema.boolean(),
  status: schema.oneOf([
    schema.literal(agentPolicyStatuses.Active),
    schema.literal(agentPolicyStatuses.Inactive),
  ]),
  package_policies: schema.maybe(
    schema.oneOf([schema.arrayOf(schema.string()), schema.arrayOf(PackagePolicySchema)])
  ),
  updated_at: schema.string(),
  updated_by: schema.string(),
});

export const AgentPolicyResponseSchema = AgentPolicySchema.extends({
  revision: schema.number(),
  agents: schema.maybe(schema.number()),
  unprivileged_agents: schema.maybe(schema.number()),
  is_protected: schema.boolean({
    meta: {
      description:
        'Indicates whether the agent policy has tamper protection enabled. Default false.',
    },
  }),
  version: schema.maybe(schema.string()),
  is_preconfigured: schema.maybe(schema.boolean()),
  schema_version: schema.maybe(schema.string()),
  package_policies: schema.maybe(
    schema.oneOf([
      schema.arrayOf(schema.string()),
      schema.arrayOf(PackagePolicySchema, {
        meta: {
          description:
            'This field is present only when retrieving a single agent policy, or when retrieving a list of agent policies with the ?full=true parameter',
        },
      }),
    ])
  ),
});

export const GetAgentPolicyResponseSchema = schema.object({
  item: AgentPolicyResponseSchema,
});

export const FullAgentPolicyResponseSchema = schema.object({
  id: schema.string(),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
  outputs: schema
    .recordOf(
      schema.string(),
      schema.object({
        type: schema.string(),
        hosts: schema.maybe(schema.arrayOf(schema.string())),
        ca_sha256: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
        proxy_url: schema.maybe(schema.string()),
        proxy_headers: schema.maybe(schema.any()),
      })
    )
    .extendsDeep({
      unknowns: 'allow',
    }),
  output_permissions: schema.maybe(
    schema.recordOf(schema.string(), schema.recordOf(schema.string(), schema.any()))
  ),
  fleet: schema.maybe(
    schema.oneOf([
      schema.object({
        hosts: schema.arrayOf(schema.string()),
        proxy_url: schema.maybe(schema.string()),
        proxy_headers: schema.maybe(schema.any()),
        ssl: schema.maybe(
          schema.object({
            verification_mode: schema.maybe(schema.string()),
            certificate_authorities: schema.maybe(schema.arrayOf(schema.string())),
            certificate: schema.maybe(schema.string()),
            key: schema.maybe(schema.string()),
            renegotiation: schema.maybe(schema.string()),
          })
        ),
      }),
      schema.object({
        kibana: schema.object({
          hosts: schema.arrayOf(schema.string()),
          protocol: schema.string(),
          path: schema.maybe(schema.string()),
        }),
      }),
    ])
  ),
  inputs: schema.arrayOf(
    schema
      .object({
        id: schema.string(),
        name: schema.string(),
        revision: schema.number(),
        type: schema.string(),
        data_stream: schema.object({
          namespace: schema.string(),
        }),
        use_output: schema.string(),
        package_policy_id: schema.string(),
        meta: schema.maybe(
          schema.object({
            package: schema
              .maybe(
                schema.object({
                  name: schema.string(),
                  version: schema.string(),
                })
              )
              .extendsDeep({
                unknowns: 'allow',
              }),
          })
        ),
        streams: schema.maybe(
          schema
            .arrayOf(
              schema.object({
                id: schema.string(),
                data_stream: schema.object({
                  dataset: schema.string(),
                  type: schema.maybe(schema.string()),
                }),
              })
            )
            .extendsDeep({
              unknowns: 'allow',
            })
        ),
        processors: schema.maybe(
          schema.arrayOf(
            schema.object({
              add_fields: schema.object({
                target: schema.string(),
                fields: schema.recordOf(
                  schema.string(),
                  schema.oneOf([schema.string(), schema.number()])
                ),
              }),
            })
          )
        ),
      })
      .extendsDeep({
        unknowns: 'allow',
      })
  ),
  revision: schema.maybe(schema.number()),
  agent: schema.maybe(
    schema.object({
      monitoring: schema.object({
        namespace: schema.maybe(schema.string()),
        use_output: schema.maybe(schema.string()),
        enabled: schema.boolean(),
        metrics: schema.boolean(),
        logs: schema.boolean(),
        traces: schema.boolean(),
      }),
      download: schema.object({
        sourceURI: schema.string(),
      }),
      features: schema.recordOf(
        schema.string(),
        schema.object({
          enabled: schema.boolean(),
        })
      ),
      protection: schema.maybe(
        schema.object({
          enabled: schema.boolean(),
          uninstall_token_hash: schema.string(),
          signing_key: schema.string(),
        })
      ),
      logging: schema.maybe(
        schema.object({
          level: schema.maybe(schema.string()),
          to_files: schema.maybe(schema.boolean()),
          files: schema.maybe(
            schema.object({
              rotateeverybytes: schema.maybe(schema.number()),
              keepfiles: schema.maybe(schema.number()),
              interval: schema.maybe(schema.string()),
            })
          ),
        })
      ),
      limits: schema.maybe(
        schema.object({
          go_max_procs: schema.maybe(schema.number()),
        })
      ),
    })
  ),
  secret_references: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
      })
    )
  ),
  signed: schema.maybe(
    schema.object({
      data: schema.string(),
      signature: schema.string(),
    })
  ),
});
const MinimalOutputSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
});

const IntegrationsOutputSchema = schema.arrayOf(
  schema.object({
    pkgName: schema.maybe(schema.string()),
    integrationPolicyName: schema.maybe(schema.string()),
    id: schema.maybe(schema.string()),
    name: schema.maybe(schema.string()),
  })
);

const OutputsForAgentPolicySchema = schema.object({
  agentPolicyId: schema.maybe(schema.string()),
  monitoring: schema.object({
    output: MinimalOutputSchema,
  }),
  data: schema.object({
    output: MinimalOutputSchema,
    integrations: schema.maybe(IntegrationsOutputSchema),
  }),
});

export const GetAgentPolicyOutputsResponseSchema = schema.object({
  item: OutputsForAgentPolicySchema,
});

export const GetListAgentPolicyOutputsResponseSchema = schema.object({
  items: schema.arrayOf(OutputsForAgentPolicySchema),
});
