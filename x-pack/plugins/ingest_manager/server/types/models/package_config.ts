/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

const ConfigRecordSchema = schema.recordOf(
  schema.string(),
  schema.object({
    type: schema.maybe(schema.string()),
    value: schema.maybe(schema.any()),
  })
);

const PackageConfigBaseSchema = {
  name: schema.string(),
  description: schema.maybe(schema.string()),
  namespace: schema.string({ minLength: 1 }),
  config_id: schema.string(),
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
          dataset: schema.object({ name: schema.string(), type: schema.string() }),
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

export const NewPackageConfigSchema = schema.object({
  ...PackageConfigBaseSchema,
});

export const UpdatePackageConfigSchema = schema.object({
  ...PackageConfigBaseSchema,
  version: schema.maybe(schema.string()),
});

export const PackageConfigSchema = schema.object({
  ...PackageConfigBaseSchema,
  id: schema.string(),
  version: schema.maybe(schema.string()),
});
