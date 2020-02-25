/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

const DatasourceBaseSchema = {
  name: schema.string(),
  namespace: schema.maybe(schema.string()),
  read_alias: schema.maybe(schema.string()),
  agent_config_id: schema.string(),
  package: schema.maybe(
    schema.object({
      assets: schema.arrayOf(
        schema.object({
          id: schema.string(),
          type: schema.string(),
        })
      ),
      description: schema.string(),
      name: schema.string(),
      title: schema.string(),
      version: schema.string(),
    })
  ),
  streams: schema.arrayOf(
    schema.object({
      config: schema.recordOf(schema.string(), schema.any()),
      input: schema.object({
        type: schema.string(),
        config: schema.recordOf(schema.string(), schema.any()),
        fields: schema.maybe(schema.arrayOf(schema.recordOf(schema.string(), schema.any()))),
        ilm_policy: schema.maybe(schema.string()),
        index_template: schema.maybe(schema.string()),
        ingest_pipelines: schema.maybe(schema.arrayOf(schema.string())),
      }),
      output_id: schema.string(),
      processors: schema.maybe(schema.arrayOf(schema.string())),
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

export type NewDatasource = TypeOf<typeof NewDatasourceSchema>;

export type Datasource = TypeOf<typeof DatasourceSchema>;
