/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const timefilterControl = () => ({
  name: 'timefilterControl',
  aliases: [],
  type: 'render',
  context: {
    types: ['null'],
  },
  help: 'Configure a time filter control element',
  args: {
    column: {
      type: ['string'],
      aliases: ['field', 'c'],
      help: 'The column or field to attach the filter to',
    },
    compact: {
      type: ['boolean'],
      help: 'Show the time filter as a button that triggers a popover',
      default: true,
      options: [true, false],
    },
  },
  fn: (context, args) => {
    return {
      type: 'render',
      as: 'time_filter',
      value: args,
    };
  },
});
