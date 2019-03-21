/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';
// @ts-ignore
import { registries } from 'plugins/interpreter/registries';

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function sampleVisFunction() {
  return {
    name: 'xy_chart',
    type: 'render',
    context: { types: ['datatable'] },
    fn(context: any) {
      return {
        type: 'render',
        as: 'xy_chart_renderer',
        value: context,
      };
    },
  };
}

function sampleVisRenderer() {
  return {
    name: 'xy_chart_renderer',
    displayName: 'XY Chart',
    reuseDomNode: true,
    render: async (domNode: any, config: any, handlers: any) => {
      domNode.innerText = JSON.stringify(config);
    },
  };
}

export const registerPipeline = () => {
  register(registries, {
    browserFunctions: [sampleVisFunction],
    renderers: [sampleVisRenderer],
  });
};
