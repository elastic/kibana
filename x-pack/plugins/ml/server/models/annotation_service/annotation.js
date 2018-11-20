/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function annotationProvider(callWithRequest) {

  async function addAnnotation(d) {
    console.log('body', d);
    return callWithRequest('index', {
      index: '.ml-annotations',
      type: 'annotation',
      //id: '',
      body: d
    });
  }


  return {
    addAnnotation
  };
}
