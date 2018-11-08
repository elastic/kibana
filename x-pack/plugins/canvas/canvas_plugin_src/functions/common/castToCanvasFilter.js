/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const castToCanvasFilter = () => ({
  name: 'castToCanvasFilter',
  aliases: [],
  type: 'filter',
  context: {
    types: ['pointSeriesFilter', 'filter', 'any'],
  },
  fn(context) {
    if (context.type === 'filter') {
      return context;
    } else if (context.type === 'pointSeriesFilter' || context.type === 'any') {
      console.log('castToCanvasFilter context is ', context);
      const ret = {
        type: 'filter',
        and: [
          {
            type: 'exactly',
            column: context.value.column,
            value: context.value.filter.series.label,
          },
        ],
      };
      console.log('castToCanvasFilter ret is ', ret);
      return ret;
    }
  },
});
