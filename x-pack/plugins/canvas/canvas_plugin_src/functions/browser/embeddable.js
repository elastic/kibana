/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const embeddable = () => ({
  name: 'embeddable',
  aliases: [],
  type: 'render',
  help: 'blah',
  context: {
    types: ['datatable', 'null'],
  },
  args: {
    id: {
      types: ['string'],
      help: 'The embeddable id',
      default: {},
    },
    type: {
      types: ['string'],
      help: 'The embeddable type',
      default: 'visualization',
    },
  },
  fn: (context, args) => {
    return {
      type: 'render',
      as: 'embeddable',
      value: {
        type: args.type,
        id: args.id,
      },
    };
  },
});
