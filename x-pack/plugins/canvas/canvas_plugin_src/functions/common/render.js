/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const render = () => ({
  name: 'render',
  aliases: [],
  type: 'render',
  help: i18n.translate('xpack.canvas.functions.renderHelpText', {
    defaultMessage:
      'Render an input as a specific element and set element level options such as styling',
  }),
  context: {
    types: ['render'],
  },
  args: {
    as: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.render.args.asHelpText', {
        defaultMessage:
          'The element type to use in rendering. You probably want a specialized function instead, such as plot or grid',
      }),
    },
    css: {
      types: ['string', 'null'],
      default: '"* > * {}"',
      help: i18n.translate('xpack.canvas.functions.render.args.cssHelpText', {
        defaultMessage: 'Any block of custom CSS to be scoped to this element.',
      }),
    },
    containerStyle: {
      types: ['containerStyle', 'null'],
      help: i18n.translate('xpack.canvas.functions.render.args.containerStyleHelpText', {
        defaultMessage: 'Style for the container, including background, border, and opacity',
      }),
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
