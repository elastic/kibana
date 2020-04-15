/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Annotation } from '../../../../common/types/annotations';
import { http, http$ } from '../http_service';
import { basePath } from './index';

export const annotations = {
  getAnnotations(obj: {
    jobIds: string[];
    earliestMs: number;
    latestMs: number;
    maxAnnotations: number;
  }) {
    const body = JSON.stringify(obj);
    return http$<{ annotations: Record<string, Annotation[]> }>({
      path: `${basePath()}/annotations`,
      method: 'POST',
      body,
    });
  },
  indexAnnotation(obj: any) {
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
