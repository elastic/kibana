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

import { ANNOTATION_TYPE } from '../constants/annotations';

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
