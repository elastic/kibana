/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import semverValid from 'semver/functions/valid';

import { AgentPolicyBaseSchema } from './agent_policy';
import { NamespaceSchema } from './package_policy';

const varsSchema = schema.maybe(
  schema.arrayOf(
    schema.object({
      name: schema.string(),
      type: schema.maybe(schema.string()),
      value: schema.oneOf([schema.string(), schema.number()]),
    })
  )
);

export const PreconfiguredPackagesSchema = schema.arrayOf(
  schema.object({
    name: schema.string(),
    version: schema.string({
      validate: (value) => {
        if (!semverValid(value)) {
          return i18n.translate('xpack.fleet.config.invalidPackageVersionError', {
            defaultMessage: 'must be a valid semver',
          });
        }
      },
    }),
  })
);

export const PreconfiguredAgentPoliciesSchema = schema.arrayOf(
  schema.object({
    ...AgentPolicyBaseSchema,
    namespace: schema.maybe(NamespaceSchema),
    id: schema.oneOf([schema.string(), schema.number()]),
    package_policies: schema.arrayOf(
      schema.object({
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
              vars: varsSchema,
              streams: schema.maybe(
                schema.arrayOf(
                  schema.object({
                    data_stream: schema.object({
                      type: schema.maybe(schema.string()),
                      dataset: schema.string(),
                    }),
                    enabled: schema.maybe(schema.boolean()),
                    vars: varsSchema,
                  })
                )
              ),
            })
          )
        ),
      })
    ),
  })
);
