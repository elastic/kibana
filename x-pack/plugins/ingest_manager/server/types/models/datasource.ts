/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
export { Datasource, NewDatasource } from '../../../common';

const ConfigRecordSchema = schema.recordOf(
  schema.string(),
  schema.object({
    type: schema.maybe(schema.string()),
    value: schema.maybe(schema.any()),
  })
);

const DatasourceBaseSchema = {
  name: schema.string(),
  description: schema.maybe(schema.string()),
  namespace: schema.maybe(schema.string()),
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
      processors: schema.maybe(schema.arrayOf(schema.string())),
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
          dataset: schema.string(),
          processors: schema.maybe(schema.arrayOf(schema.string())),
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

export const NewDatasourceSchema = schema.object({
  ...DatasourceBaseSchema,
});

export const DatasourceSchema = schema.object({
  ...DatasourceBaseSchema,
  id: schema.string(),
});
