/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const actionVariableSchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  usesPublicBaseUrl: schema.maybe(schema.boolean()),
});

const actionGroupSchema = schema.object(
  {
    id: schema.string(),
    name: schema.string(),
  },
  {
    meta: {
      description:
        'An action group to use when an alert goes from an active state to an inactive one.',
    },
  }
);

export const typesRulesResponseBodySchema = schema.arrayOf(
  schema.object({
    action_groups: schema.maybe(
      schema.arrayOf(actionGroupSchema, {
        meta: {
          description:
            "An explicit list of groups for which the rule type can schedule actions, each with the action group's unique ID and human readable name. Rule actions validation uses this configuration to ensure that groups are valid.",
        },
      })
    ),
    action_variables: schema.maybe(
      schema.object(
        {
          context: schema.maybe(schema.arrayOf(actionVariableSchema)),
          state: schema.maybe(schema.arrayOf(actionVariableSchema)),
          params: schema.maybe(schema.arrayOf(actionVariableSchema)),
        },
        {
          meta: {
            description:
              'A list of action variables that the rule type makes available via context and state in action parameter templates, and a short human readable description. When you create a rule in Kibana, it uses this information to prompt you for these variables in action parameter editors.',
          },
        }
      )
    ),
    alerts: schema.maybe(
      schema.object(
        {
          context: schema.string({
            meta: {
              description: 'The namespace for this rule type.',
            },
          }),
          mappings: schema.maybe(
            schema.object({
              dynamic: schema.maybe(
                schema.oneOf([schema.literal(false), schema.literal('strict')], {
                  meta: {
                    description: 'Indicates whether new fields are added dynamically.',
                  },
                })
              ),
              fieldMap: schema.recordOf(schema.string(), schema.any(), {
                meta: {
                  description:
                    'Mapping information for each field supported in alerts as data documents for this rule type. For more information about mapping parameters, refer to the Elasticsearch documentation.',
                },
              }),
              shouldWrite: schema.maybe(
                schema.boolean({
                  meta: {
                    description: 'Indicates whether the rule should write out alerts as data.',
                  },
                })
              ),
              useEcs: schema.maybe(
                schema.boolean({
                  meta: {
                    description:
                      'Indicates whether to include the ECS component template for the alerts.',
                  },
                })
              ),
            })
          ),
        },
        {
          meta: {
            description: 'Details for writing alerts as data documents for this rule type.',
          },
        }
      )
    ),
    authorized_consumers: schema.recordOf(
      schema.string(),
      schema.object({ read: schema.boolean(), all: schema.boolean() }),
      {
        meta: {
          description: 'The list of the plugins IDs that have access to the rule type.',
        },
      }
    ),
    category: schema.string({
      meta: {
        description:
          'The rule category, which is used by features such as category-specific maintenance windows.',
      },
    }),
    default_action_group_id: schema.string({
      meta: {
        description: 'The default identifier for the rule type group.',
      },
    }),
    default_schedule_interval: schema.maybe(schema.string()),
    does_set_recovery_context: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'Indicates whether the rule passes context variables to its recovery action.',
        },
      })
    ),
    enabled_in_license: schema.boolean({
      meta: {
        description:
          'Indicates whether the rule type is enabled or disabled based on the subscription.',
      },
    }),
    fieldsForAAD: schema.maybe(schema.arrayOf(schema.string())),
    has_alerts_mappings: schema.boolean({
      meta: {
        description: 'Indicates whether the rule type has custom mappings for the alert data.',
      },
    }),
    has_fields_for_a_a_d: schema.boolean({
      meta: {
        description:
          'Indicates whether the rule type has fields for alert as data for the alert data.  ',
      },
    }),
    id: schema.string({
      meta: {
        description: 'The unique identifier for the rule type.',
      },
    }),
    is_exportable: schema.boolean({
      meta: {
        description:
          'Indicates whether the rule type is exportable in Stack Management > Saved Objects.',
      },
    }),
    minimum_license_required: schema.oneOf(
      [
        schema.literal('basic'),
        schema.literal('gold'),
        schema.literal('platinum'),
        schema.literal('standard'),
        schema.literal('enterprise'),
        schema.literal('trial'),
      ],
      {
        meta: {
          description: 'The subscriptions required to use the rule type.',
        },
      }
    ),
    name: schema.string({
      meta: {
        description: 'The descriptive name of the rule type.',
      },
    }),
    producer: schema.string({
      meta: {
        description: 'An identifier for the application that produces this rule type.',
      },
    }),
    recovery_action_group: actionGroupSchema,
    rule_task_timeout: schema.maybe(schema.string()),
  })
);

export const typesRulesResponseSchema = schema.object({
  body: typesRulesResponseBodySchema,
});
