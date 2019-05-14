/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { render } from '../../functions/common/render';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof render>> = {
  help: i18n.translate('xpack.canvas.functions.renderHelpText', {
    defaultMessage:
      'Render an input as a specific element and set element level options such as styling',
  }),
  args: {
    as: i18n.translate('xpack.canvas.functions.render.args.asHelpText', {
      defaultMessage:
        'The element type to use in rendering. You probably want a specialized function instead, such as `{plot}` or `{grid}`',
      values: {
        plot: 'plot',
        grid: 'grid',
      },
    }),
    css: i18n.translate('xpack.canvas.functions.render.args.cssHelpText', {
      defaultMessage: 'Any block of custom {css} to be scoped to this element.',
      values: {
        css: 'CSS',
      },
    }),
    containerStyle: i18n.translate('xpack.canvas.functions.render.args.containerStyleHelpText', {
      defaultMessage: 'Style for the container, including background, border, and opacity',
    }),
  },
};
