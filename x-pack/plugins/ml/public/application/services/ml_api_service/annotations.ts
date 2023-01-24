/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { HttpService } from '../http_service';
import { useMlKibana } from '../../contexts/kibana';
import type { Annotation, GetAnnotationsResponse } from '../../../../common/types/annotations';
import { basePath } from '.';

export const annotationsApiProvider = (httpService: HttpService) => ({
  getAnnotations$(obj: {
    jobIds: string[];
    earliestMs: number;
    latestMs: number;
    maxAnnotations: number;
    detectorIndex?: number;
    entities?: any[];
  }) {
    const body = JSON.stringify(obj);
    return httpService.http$<GetAnnotationsResponse>({
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
    return httpService.http<GetAnnotationsResponse>({
      path: `${basePath()}/annotations`,
      method: 'POST',
      body,
    });
  },

  indexAnnotation(obj: Annotation) {
    const body = JSON.stringify(obj);
    return httpService.http<any>({
      path: `${basePath()}/annotations/index`,
      method: 'PUT',
      body,
    });
  },
  deleteAnnotation(id: string) {
    return httpService.http<any>({
      path: `${basePath()}/annotations/delete/${id}`,
      method: 'DELETE',
    });
  },
});

export type AnnotationsApiService = ReturnType<typeof annotationsApiProvider>;

/**
 * Hooks for accessing {@link AnnotationsApiService} in React components.
 */
export function useAnnotationsApiService(): AnnotationsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => annotationsApiProvider(httpService), [httpService]);
}
