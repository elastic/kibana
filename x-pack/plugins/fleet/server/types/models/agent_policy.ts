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
  global_data_tags: schema.maybe(
    schema.arrayOf(
      schema.object({
        name: schema.string(),
        value: schema.oneOf([schema.string(), schema.number()]),
      }),
      {
        validate: validateGlobalDataTagInput,
      }
    )
  ),
  monitoring_pprof_enabled: schema.maybe(schema.boolean()),
  monitoring_http: schema.maybe(
    schema.object({
      enabled: schema.maybe(schema.boolean()),
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
  package_policies: schema.oneOf([
    schema.arrayOf(schema.string()),
    schema.arrayOf(PackagePolicySchema),
  ]),
  updated_at: schema.string(),
  updated_by: schema.string(),
});
