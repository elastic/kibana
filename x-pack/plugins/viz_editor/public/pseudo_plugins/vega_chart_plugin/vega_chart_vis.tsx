/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function sampleVisFunction() {
  return {
    name: 'vega_data_prep',
    type: 'vega_literal_data',
    args: {
      spec: {
        types: ['string'],
      },
      from: { types: ['string'] },
      to: { types: ['string'] },
    },
    context: { types: ['kibana_datatable'] },
    fn(context: any, args: any) {
      const specWithData = (args.spec as string).replace(
        'EXPRESSION_DATA_HERE',
        JSON.stringify(context.rows)
      );
      return {
        type: 'vega_literal_data',
        timeRange: { from: args.from, to: args.to },
        query: [],
        filters: [],
        value: {
          spec: specWithData,
        },
      };
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [sampleVisFunction],
  });
};

/*
Example vega spec which uses the provided data
{
  "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
  "description": "A simple bar chart with embedded data.",
  "data": {
    "values": EXPRESSION_DATA_HERE
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "col-1", "type": "ordinal"},
    "y": {"field": "col-2", "type": "quantitative"}
  }
}
*/
