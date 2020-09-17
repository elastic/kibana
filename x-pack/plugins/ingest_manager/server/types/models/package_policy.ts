/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { isValidNamespace } from '../../../common';

export const NamespaceSchema = schema.string({
  minLength: 1,
  validate: (value) => {
    if (!isValidNamespace(value)) {
      return 'Namespace contains invalid characters';
    }
  },
});

const ConfigRecordSchema = schema.recordOf(
  schema.string(),
  schema.object({
    type: schema.maybe(schema.string()),
    value: schema.maybe(schema.any()),
  })
);

const PackagePolicyBaseSchema = {
  name: schema.string(),
  description: schema.maybe(schema.string()),
  namespace: NamespaceSchema,
  policy_id: schema.string(),
  enabled: schema.boolean(),
  package: schema.maybe(
    schema.object({
      name: schema.string(),
      title: schema.string(),
      version: schema.string(),
    })
  ),
  output_id: schema.string(),
  inputs: schema.arrayOf(
    schema.object({
      type: schema.string(),
      enabled: schema.boolean(),
      vars: schema.maybe(ConfigRecordSchema),
      config: schema.maybe(
        schema.recordOf(
          schema.string(),
          schema.object({
            type: schema.maybe(schema.string()),
            value: schema.maybe(schema.any()),
          })
        )
      ),
      streams: schema.arrayOf(
        schema.object({
          id: schema.string(),
          enabled: schema.boolean(),
          data_stream: schema.object({ dataset: schema.string(), type: schema.string() }),
          vars: schema.maybe(ConfigRecordSchema),
          config: schema.maybe(
            schema.recordOf(
              schema.string(),
              schema.object({
                type: schema.maybe(schema.string()),
                value: schema.maybe(schema.any()),
              })
            )
          ),
        })
      ),
    })
  ),
};

export const NewPackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
});

export const UpdatePackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
  version: schema.maybe(schema.string()),
});

export const PackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
  id: schema.string(),
  version: schema.maybe(schema.string()),
});
