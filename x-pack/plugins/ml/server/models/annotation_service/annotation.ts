/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Annotation, isAnnotation } from '../../../common/interfaces/annotations';

interface IndexParams {
  index: string;
  type: string;
  body: Annotation;
  refresh?: string;
  id?: string;
}

interface DeleteParams {
  index: string;
  type: string;
  refresh?: string;
  id: string;
}

export function annotationProvider(
  callWithRequest: (action: string, params: IndexParams | DeleteParams) => {}
) {
  async function indexAnnotation(annotation: Annotation) {
    if (isAnnotation(annotation) === false) {
      return Promise.reject(new Error('invalid annotation format'));
    }

    const params: IndexParams = {
      index: '.ml-annotations',
      type: 'annotation',
      body: annotation,
      refresh: 'wait_for',
    };

    if (typeof annotation._id !== 'undefined') {
      params.id = annotation._id;
      delete params.body._id;
    }

    return await callWithRequest('index', params);
  }

  async function deleteAnnotation(id: string) {
    const param: DeleteParams = {
      index: '.ml-annotations',
      type: 'annotation',
      id,
      refresh: 'wait_for',
    };

    return await callWithRequest('delete', param);
  }

  return {
    indexAnnotation,
    deleteAnnotation,
  };
}
