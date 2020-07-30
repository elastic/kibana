/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// The Annotation interface is based on annotation documents stored in the
// `.ml-annotations-6` index, accessed via the `.ml-annotations-[read|write]` aliases.

// Annotation document mapping:
// PUT .ml-annotations-6
// {
//   "mappings": {
//     "annotation": {
//       "properties": {
//         "annotation": {
//           "type": "text"
//         },
//         "create_time": {
//           "type": "date",
//           "format": "epoch_millis"
//         },
//         "create_username": {
//           "type": "keyword"
//         },
//         "timestamp": {
//           "type": "date",
//           "format": "epoch_millis"
//         },
//         "end_timestamp": {
//           "type": "date",
//           "format": "epoch_millis"
//         },
//         "job_id": {
//           "type": "keyword"
//         },
//         "modified_time": {
//           "type": "date",
//           "format": "epoch_millis"
//         },
//         "modified_username": {
//           "type": "keyword"
//         },
//         "type": {
//           "type": "keyword"
//         }
//       }
//     }
//   }
// }

// Alias
// POST /_aliases
// {
//     "actions" : [
//         { "add" : { "index" : ".ml-annotations-6", "alias" : ".ml-annotations-read" } },
//         { "add" : { "index" : ".ml-annotations-6", "alias" : ".ml-annotations-write" } }
//     ]
// }

import { PartitionFieldsType } from './anomalies';
import { ANNOTATION_TYPE } from '../constants/annotations';

export type AnnotationFieldName = 'partition_field_name' | 'over_field_name' | 'by_field_name';
export type AnnotationFieldValue = 'partition_field_value' | 'over_field_value' | 'by_field_value';

export function getAnnotationFieldName(fieldType: PartitionFieldsType): AnnotationFieldName {
  return `${fieldType}_name` as AnnotationFieldName;
}

export function getAnnotationFieldValue(fieldType: PartitionFieldsType): AnnotationFieldValue {
  return `${fieldType}_value` as AnnotationFieldValue;
}

export interface Annotation {
  _id?: string;
  create_time?: number;
  create_username?: string;
  modified_time?: number;
  modified_username?: string;
  key?: string;

  timestamp: number;
  end_timestamp?: number;
  annotation: string;
  job_id: string;
  type: ANNOTATION_TYPE.ANNOTATION | ANNOTATION_TYPE.COMMENT;
  event?: string;
  detector_index?: number;
  partition_field_name?: string;
  partition_field_value?: string;
  over_field_name?: string;
  over_field_value?: string;
  by_field_name?: string;
  by_field_value?: string;
}
export function isAnnotation(arg: any): arg is Annotation {
  return (
    arg.timestamp !== undefined &&
    typeof arg.annotation === 'string' &&
    typeof arg.job_id === 'string' &&
    (arg.type === ANNOTATION_TYPE.ANNOTATION || arg.type === ANNOTATION_TYPE.COMMENT)
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Annotations extends Array<Annotation> {}

export function isAnnotations(arg: any): arg is Annotations {
  if (Array.isArray(arg) === false) {
    return false;
  }
  return arg.every((d: Annotation) => isAnnotation(d));
}

export interface FieldToBucket {
  field: string;
  missing?: string | number;
}

export interface FieldToBucketResult {
  key: string;
  doc_count: number;
}

export interface TermAggregationResult {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: FieldToBucketResult[];
}

export type EsAggregationResult = Record<string, TermAggregationResult>;

export interface GetAnnotationsResponse {
  aggregations?: EsAggregationResult;
  annotations: Record<string, Annotations>;
  success: boolean;
}
