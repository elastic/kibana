/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Annotation, isAnnotation } from '../../../common/interfaces/annotations';

export function annotationProvider(callWithRequest) {
  async function addAnnotation(d: Annotation) {
    if (isAnnotation(d) === false) {
      return Promise.reject(new Error('invalid annotation format'));
    }

    let response;

    // if d._id is not present, create new annotation
    if (typeof d._id === 'undefined') {
      response = await callWithRequest('index', {
        index: '.ml-annotations',
        type: 'annotation',
        body: d,
      });
    } else {
      const id = d._id;
      delete d._id;
      response = await callWithRequest('update', {
        index: '.ml-annotations',
        type: 'annotation',
        id,
        body: {
          doc: d,
        },
      });
    }

    // refresh the annotations index so we can make sure the annotations up to date right away.
    await callWithRequest('indices.refresh', {
      index: '.ml-annotations',
    });

    return response;
  }

  async function deleteAnnotation(id: string) {
    const addAnnotationResponse = await callWithRequest('delete', {
      index: '.ml-annotations',
      type: 'annotation',
      id,
    });

    // refresh the annotations index so we can make sure the annotations up to date right away.
    await callWithRequest('indices.refresh', {
      index: '.ml-annotations',
    });

    return addAnnotationResponse;
  }

  return {
    addAnnotation,
    deleteAnnotation,
  };
}
