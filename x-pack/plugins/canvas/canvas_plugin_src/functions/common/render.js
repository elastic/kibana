/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const render = () => ({
  name: 'render',
  aliases: [],
  type: 'render',
  help: 'Render an input as a specific element and set element level options such as styling',
  context: {
    types: ['render'],
  },
  args: {
    as: {
      types: ['string', 'null'],
      help:
        'The element type to use in rendering. You probably want a specialized function instead, such as plot or grid',
      options: ['debug', 'error', 'image', 'pie', 'plot', 'shape', 'table', 'text'],
    },
    css: {
      types: ['string', 'null'],
      default: '"* > * {}"',
      help: 'Any block of custom CSS to be scoped to this element.',
    },
    containerStyle: {
      types: ['containerStyle', 'null'],
      help: 'Style for the container, including background, border, and opacity',
    },
  },
  fn: (context, args) => {
    return {
      ...context,
      as: args.as || context.as,
      css: args.css,
      containerStyle: args.containerStyle,
    };
  },
});
