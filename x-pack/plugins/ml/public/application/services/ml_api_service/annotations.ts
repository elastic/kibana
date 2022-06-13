/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Annotation, GetAnnotationsResponse } from '../../../../common/types/annotations';
import { http, http$ } from '../http_service';
import { basePath } from '.';

export const annotations = {
  getAnnotations$(obj: {
    jobIds: string[];
    earliestMs: number;
    latestMs: number;
    maxAnnotations: number;
    detectorIndex?: number;
    entities?: any[];
  }) {
    const body = JSON.stringify(obj);
    return http$<GetAnnotationsResponse>({
      path: `${basePath()}/annotations`,
      method: 'POST',
      body,
    });
  },

  getAnnotations(obj: {
    jobIds: string[];
    earliestMs: number | null;
    latestMs: number | null;
    maxAnnotations: number;
    detectorIndex?: number;
    entities?: any[];
  }) {
    const body = JSON.stringify(obj);
    return http<GetAnnotationsResponse>({
      path: `${basePath()}/annotations`,
      method: 'POST',
      body,
    });
  },

  indexAnnotation(obj: Annotation) {
    const body = JSON.stringify(obj);
    return http<any>({
      path: `${basePath()}/annotations/index`,
      method: 'PUT',
      body,
    });
  },
  deleteAnnotation(id: string) {
    return http<any>({
      path: `${basePath()}/annotations/delete/${id}`,
      method: 'DELETE',
    });
  },
};
