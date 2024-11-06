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

const actionGroupSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
});

export const typesRulesResponseBodySchema = schema.arrayOf(
  schema.object({
    action_groups: schema.maybe(schema.arrayOf(actionGroupSchema)),
    action_variables: schema.maybe(
      schema.object({
        context: schema.maybe(schema.arrayOf(actionVariableSchema)),
        state: schema.maybe(schema.arrayOf(actionVariableSchema)),
        params: schema.maybe(schema.arrayOf(actionVariableSchema)),
      })
    ),
    alerts: schema.maybe(
      schema.object({
        context: schema.string(),
        mappings: schema.maybe(
          schema.object({
            dynamic: schema.maybe(schema.oneOf([schema.literal(false), schema.literal('strict')])),
            fieldMap: schema.recordOf(schema.string(), schema.any()),
            shouldWrite: schema.maybe(schema.boolean()),
            useEcs: schema.maybe(schema.boolean()),
          })
        ),
      })
    ),
    authorized_consumers: schema.recordOf(
      schema.string(),
      schema.object({ read: schema.boolean(), all: schema.boolean() })
    ),
    category: schema.string(),
    default_action_group_id: schema.string(),
    default_schedule_interval: schema.maybe(schema.string()),
    does_set_recovery_context: schema.maybe(schema.boolean()),
    enabled_in_license: schema.boolean(),
    fieldsForAAD: schema.maybe(schema.arrayOf(schema.string())),
    has_alerts_mappings: schema.boolean(),
    has_fields_for_a_a_d: schema.boolean(),
    id: schema.string(),
    is_exportable: schema.boolean(),
    minimum_license_required: schema.oneOf([
      schema.literal('basic'),
      schema.literal('gold'),
      schema.literal('platinum'),
      schema.literal('standard'),
      schema.literal('enterprise'),
      schema.literal('trial'),
    ]),
    name: schema.string(),
    producer: schema.string(),
    recovery_action_group: actionGroupSchema,
    rule_task_timeout: schema.maybe(schema.string()),
  })
);

export const typesRulesResponseSchema = schema.object({
  body: typesRulesResponseBodySchema,
});
