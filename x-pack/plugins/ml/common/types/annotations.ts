/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Annotation {
  _id?: string;
  create_time?: number;
  create_username?: string;
  modified_time?: number;
  modified_username?: string;

  timestamp: number;
  end_timestamp?: number;
  annotation: string;
  job_id: string;
  result_type: 'annotation';
}

export function isAnnotation(arg: any): arg is Annotation {
  return (
    arg.timestamp !== undefined &&
    typeof arg.annotation === 'string' &&
    typeof arg.job_id === 'string' &&
    arg.result_type === 'annotation'
  );
}

export interface Annotations extends Array<Annotation> {}

export function isAnnotations(arg: any): arg is Annotations {
  if (Array.isArray(arg) === false) {
    return false;
  }
  return arg.every((d: Annotation) => isAnnotation(d));
}
