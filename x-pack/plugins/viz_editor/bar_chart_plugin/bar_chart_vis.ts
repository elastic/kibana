/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';
// @ts-ignore
import { registries } from '@kbn/interpreter/public';

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function sampleVisFunction() {
  return {
    name: 'bar_chart',
    type: 'render',
  };
}

function sampleVisRenderer() {
  return {
    name: 'bar_chart_renderer',
    displayName: 'Bar Chart',
    reuseDomNode: true,
    render: async (domNode: any, config: any, handlers: any) => {
      // TODO mount something to the dom node here
    },
  };
}

export const registerPipeline = () => {
  register(registries, {
    browserFunctions: [sampleVisFunction],
    renderers: [sampleVisRenderer],
  });
};
