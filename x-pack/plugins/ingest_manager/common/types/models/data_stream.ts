/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

export enum InputType {
  Etc = 'etc',
  Log = 'log',
  MetricDocker = 'metric/docker',
  MetricSystem = 'metric/system',
}

const DataStreamBaseSchema = {
  name: schema.string(),
  read_alias: schema.maybe(schema.string()),
  agent_config_id: schema.string(),
  input: schema.object({
    type: schema.oneOf([
      schema.literal(InputType.Etc),
      schema.literal(InputType.Log),
      schema.literal(InputType.MetricDocker),
      schema.literal(InputType.MetricSystem),
    ]),
    config: schema.recordOf(schema.string(), schema.any()),
    fields: schema.maybe(schema.arrayOf(schema.recordOf(schema.string(), schema.any()))),
    ilm_policy: schema.maybe(schema.string()),
    index_template: schema.maybe(schema.string()),
    ingest_pipelines: schema.maybe(schema.arrayOf(schema.string())),
  }),
  output_id: schema.string(),
  processors: schema.maybe(schema.arrayOf(schema.string())),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  package: schema.maybe(
    schema.object({
      assets: schema.object({
        id: schema.string(),
        type: schema.string(),
      }),
      description: schema.string(),
      name: schema.string(),
      title: schema.string(),
      version: schema.string(),
    })
  ),
};

export const NewDataStreamSchema = schema.object({
  ...DataStreamBaseSchema,
});

export const DataStreamSchema = schema.object({
  ...DataStreamBaseSchema,
  id: schema.string(),
});

export type NewDataStream = TypeOf<typeof NewDataStreamSchema>;

export type DataStream = TypeOf<typeof DataStreamSchema>;
