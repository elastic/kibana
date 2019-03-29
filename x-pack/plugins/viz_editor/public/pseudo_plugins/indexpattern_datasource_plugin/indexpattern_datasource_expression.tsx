/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';
import { kfetch } from 'ui/kfetch';

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function esDocsFunction() {
  return {
    name: 'client_esdocs',
    type: 'datatable',
    args: {
      index: {
        types: ['string'],
      },
      fields: {
        types: ['string'],
      },
      filter: {
        types: ['string'],
      },
      timeRange: {
        types: ['string'],
      },
    },
    context: { types: [] },
    async fn(context: any, args: any) {
      const queries = JSON.parse(args.queries);
      const query = Object.values(queries)[0];
      const result: any = await kfetch({
        pathname: '/api/viz_editor/search',
        method: 'POST',
        body: JSON.stringify({
          query,
          indexpattern: args.indexpattern,
        }),
      });

      return {
        type: 'datatable',
        ...result,
      };
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [esDocsFunction],
  });
};
