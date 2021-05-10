/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ANNOTATION_TYPE } from '../../../common/constants/annotations';

export const indexAnnotationSchema = schema.object({
  timestamp: schema.number(),
  end_timestamp: schema.number(),
  annotation: schema.string(),
  job_id: schema.string(),
  type: schema.oneOf([
    schema.literal(ANNOTATION_TYPE.ANNOTATION),
    schema.literal(ANNOTATION_TYPE.COMMENT),
  ]),
  create_time: schema.maybe(schema.number()),
  create_username: schema.maybe(schema.string()),
  modified_time: schema.maybe(schema.number()),
  modified_username: schema.maybe(schema.string()),
  event: schema.maybe(schema.string()),
  detector_index: schema.maybe(schema.number()),
  partition_field_name: schema.maybe(schema.string()),
  partition_field_value: schema.maybe(schema.string()),
  over_field_name: schema.maybe(schema.string()),
  over_field_value: schema.maybe(schema.string()),
  by_field_name: schema.maybe(schema.string()),
  by_field_value: schema.maybe(schema.string()),
  /** Document id */
  _id: schema.maybe(schema.string()),
  key: schema.maybe(schema.string()),
});

export const getAnnotationsSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  earliestMs: schema.nullable(schema.number()),
  latestMs: schema.nullable(schema.number()),
  maxAnnotations: schema.number(),
  /** Fields to find unique values for (e.g. events or created_by) */
  fields: schema.maybe(
    schema.arrayOf(
      schema.object({
        field: schema.string(),
        missing: schema.maybe(schema.string()),
      })
    )
  ),
  detectorIndex: schema.maybe(schema.number()),
  entities: schema.maybe(
    schema.arrayOf(
      schema.object({
        fieldType: schema.maybe(schema.string()),
        fieldName: schema.maybe(schema.string()),
        fieldValue: schema.maybe(schema.string()),
      })
    )
  ),
});

export const deleteAnnotationSchema = schema.object({ annotationId: schema.string() });
