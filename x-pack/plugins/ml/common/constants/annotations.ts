/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ANNOTATION_TYPE {
  ANNOTATION = 'annotation',
  COMMENT = 'comment',
}

export const ANNOTATION_USER_UNKNOWN = '<user unknown>';

// UI enforced limit to the maximum number of characters that can be entered for an annotation.
export const ANNOTATION_MAX_LENGTH_CHARS = 1000;
