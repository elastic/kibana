/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
export { Datasource, NewDatasource } from '../../../common';

const DatasourceBaseSchema = {
  enabled: schema.maybe(schema.boolean()),
  title: schema.maybe(schema.string()),
  package: schema.maybe(
    schema.object({
      name: schema.string(),
      version: schema.string(),
    })
  ),
  namespace: schema.maybe(schema.string()),
  use_output: schema.string(),
  inputs: schema.arrayOf(
    schema.object({
      type: schema.string(),
      processors: schema.maybe(schema.arrayOf(schema.string())),
      streams: schema.arrayOf(
        schema.object({
          id: schema.maybe(schema.string()),
          enabled: schema.maybe(schema.boolean()),
          dataset: schema.maybe(schema.string()),
          metricset: schema.maybe(schema.string()),
          paths: schema.maybe(schema.arrayOf(schema.string())),
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
