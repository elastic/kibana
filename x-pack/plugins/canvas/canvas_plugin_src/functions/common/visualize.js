/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const visualize = () => ({
  name: 'visualize',
  aliases: [],
  type: 'render',
  context: {
    types: ['filter', 'null'],
  },
  help: 'A simple visualize visualization.',
  args: {
    id: {
      types: ['string'],
      default: '""',
      help: 'id of the visualization',
      multi: false,
    },
    from: {
      type: ['string'],
      help: 'Elasticsearch date math string for the start of the time range',
      default: 'now-1y',
    },
    to: {
      type: ['string'],
      help: 'Elasticsearch date math string for the end of the time range',
      default: 'now',
    },
  },
  fn: (context, args) => {
    // Saved visualizations require a time range. Use the time range from the timefilter element
    // in the workpad, if it exists. Otherwise fall back on the function args.
    const timeFilter = context.and.find(and => and.type === 'time');
    const range = timeFilter
      ? { from: timeFilter.from, to: timeFilter.to }
      : { from: args.from, to: args.to };

    return {
      type: 'render',
      as: 'visualize',
      value: {
        options: {},
        id: args.id,
        time: range,
      },
    };
  },
});
