/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const indexAnnotationSchema = {
  timestamp: schema.number(),
  end_timestamp: schema.number(),
  annotation: schema.string(),
  job_id: schema.string(),
  type: schema.string(),
  create_time: schema.maybe(schema.number()),
  create_username: schema.maybe(schema.string()),
  modified_time: schema.maybe(schema.number()),
  modified_username: schema.maybe(schema.string()),
  _id: schema.maybe(schema.string()),
  key: schema.maybe(schema.string()),
};

export const getAnnotationsSchema = {
  jobIds: schema.arrayOf(schema.string()),
  earliestMs: schema.oneOf([schema.nullable(schema.number()), schema.maybe(schema.number())]),
  latestMs: schema.oneOf([schema.nullable(schema.number()), schema.maybe(schema.number())]),
  maxAnnotations: schema.number(),
};

export const deleteAnnotationSchema = { annotationId: schema.string() };
