/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function annotationProvider(callWithRequest) {

  async function addAnnotation(d) {
    const addAnnotationResponse = await callWithRequest('index', {
      index: '.ml-annotations',
      type: 'annotation',
      body: d
    });

    // refresh the annotations index so we can make sure the annotations show up right away.
    await callWithRequest('indices.refresh', {
      index: '.ml-annotations'
    });

    return addAnnotationResponse;
  }


  return {
    addAnnotation
  };
}
