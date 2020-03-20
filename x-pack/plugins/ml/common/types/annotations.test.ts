/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ANNOTATION_TYPE } from '../constants/annotations';

import { isAnnotation, isAnnotations } from './annotations';

describe('Types: Annotations', () => {
  test('Minimal integrity check.', () => {
    const annotation = {
      job_id: 'id',
      annotation: 'Annotation text',
      timestamp: 0,
      type: ANNOTATION_TYPE.ANNOTATION,
    };

    expect(isAnnotation(annotation)).toBe(true);
    expect(isAnnotations([annotation])).toBe(true);
  });
});
