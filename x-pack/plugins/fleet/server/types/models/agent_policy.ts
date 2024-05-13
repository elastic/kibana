/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

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
      schema.oneOf([schema.literal(dataTypes.Logs), schema.literal(dataTypes.Metrics)])
    )
  ),
  keep_monitoring_alive: schema.maybe(schema.boolean({ defaultValue: false })),
  data_output_id: schema.maybe(schema.nullable(schema.string())),
  monitoring_output_id: schema.maybe(schema.nullable(schema.string())),
  download_source_id: schema.maybe(schema.nullable(schema.string())),
  fleet_server_host_id: schema.maybe(schema.nullable(schema.string())),
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
    schema.nullable(
      schema.recordOf(schema.string(), schema.any(), {
        validate: (val) => {
          if (Object.keys(val).some((key) => key.match(/^inputs(\.)?/))) {
            return 'inputs overrides is not allowed';
          }
        },
      })
    )
  ),
  ...getSettingsAPISchema('AGENT_POLICY_ADVANCED_SETTINGS'),
  supports_agentless: schema.maybe(schema.boolean({ defaultValue: false })),
};

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
  package_policies: schema.oneOf([
    schema.arrayOf(schema.string()),
    schema.arrayOf(PackagePolicySchema),
  ]),
  updated_at: schema.string(),
  updated_by: schema.string(),
});
