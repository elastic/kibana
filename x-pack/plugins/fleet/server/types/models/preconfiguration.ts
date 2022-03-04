/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import semverValid from 'semver/functions/valid';

import { PRECONFIGURATION_LATEST_KEYWORD } from '../../constants';
import type { PreconfiguredOutput } from '../../../common';

import { AgentPolicyBaseSchema } from './agent_policy';
import { NamespaceSchema } from './package_policy';
import { NewOutputSchema } from './output';

const varsSchema = schema.maybe(
  schema.arrayOf(
    schema.object({
      name: schema.string(),
      type: schema.maybe(schema.string()),
      value: schema.maybe(schema.any()),
      frozen: schema.maybe(schema.boolean()),
    })
  )
);

export const PreconfiguredPackagesSchema = schema.arrayOf(
  schema.object({
    name: schema.string(),
    version: schema.string({
      validate: (value) => {
        if (value !== PRECONFIGURATION_LATEST_KEYWORD && !semverValid(value)) {
          return i18n.translate('xpack.fleet.config.invalidPackageVersionError', {
            defaultMessage: 'must be a valid semver, or the keyword `latest`',
          });
        }
      },
    }),
  }),
  {
    defaultValue: [],
  }
);

function validatePreconfiguredOutputs(outputs: PreconfiguredOutput[]) {
  const acc = {
    names: new Set(),
    ids: new Set(),
    is_default_exists: false,
    is_default_monitoring_exists: false,
  };

  for (const output of outputs) {
    if (acc.names.has(output.name)) {
      return 'preconfigured outputs need to have unique names.';
    }
    if (acc.ids.has(output.id)) {
      return 'preconfigured outputs need to have unique ids.';
    }
    if (acc.is_default_exists && output.is_default) {
      return 'preconfigured outputs can only have one default output.';
    }
    if (acc.is_default_monitoring_exists && output.is_default_monitoring) {
      return 'preconfigured outputs can only have one default monitoring output.';
    }

    acc.ids.add(output.id);
    acc.names.add(output.name);
    acc.is_default_exists = acc.is_default_exists || output.is_default;
    acc.is_default_monitoring_exists = acc.is_default_exists || output.is_default_monitoring;
  }
}

export const PreconfiguredOutputsSchema = schema.arrayOf(
  NewOutputSchema.extends({
    id: schema.string(),
    config: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    config_yaml: schema.never(),
  }),
  {
    defaultValue: [],
    validate: validatePreconfiguredOutputs,
  }
);

export const PreconfiguredAgentPoliciesSchema = schema.arrayOf(
  schema.object({
    ...AgentPolicyBaseSchema,
    namespace: schema.maybe(NamespaceSchema),
    id: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
    is_default: schema.maybe(schema.boolean()),
    is_default_fleet_server: schema.maybe(schema.boolean()),
    has_fleet_server: schema.maybe(schema.boolean()),
    data_output_id: schema.maybe(schema.string()),
    monitoring_output_id: schema.maybe(schema.string()),
    package_policies: schema.arrayOf(
      schema.object({
        id: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
        name: schema.string(),
        package: schema.object({
          name: schema.string(),
        }),
        description: schema.maybe(schema.string()),
        namespace: schema.maybe(NamespaceSchema),
        inputs: schema.maybe(
          schema.arrayOf(
            schema.object({
              type: schema.string(),
              enabled: schema.maybe(schema.boolean()),
              keep_enabled: schema.maybe(schema.boolean()),
              vars: varsSchema,
              streams: schema.maybe(
                schema.arrayOf(
                  schema.object({
                    data_stream: schema.object({
                      type: schema.maybe(schema.string()),
                      dataset: schema.string(),
                    }),
                    enabled: schema.maybe(schema.boolean()),
                    keep_enabled: schema.maybe(schema.boolean()),
                    vars: varsSchema,
                  })
                )
              ),
            })
          )
        ),
      })
    ),
  }),
  {
    defaultValue: [],
  }
);
