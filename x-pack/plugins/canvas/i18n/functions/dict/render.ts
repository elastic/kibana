/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { render } from '../../../canvas_plugin_src/functions/common/render';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT, CSS } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof render>> = {
  help: i18n.translate('xpack.canvas.functions.renderHelpText', {
    defaultMessage:
      'Render the {CONTEXT} as a specific element and sets element level options, such as background and border styling.',
    values: {
      CONTEXT,
    },
  }),
  args: {
    as: i18n.translate('xpack.canvas.functions.render.args.asHelpText', {
      defaultMessage:
        'The element type to render. You probably want a specialized function instead, such as {plotFn} or {shapeFn}.',
      values: {
        plotFn: '`plot`',
        shapeFn: '`shape`',
      },
    }),
    css: i18n.translate('xpack.canvas.functions.render.args.cssHelpText', {
      defaultMessage: 'Any block of custom {CSS} to be scoped to the element.',
      values: {
        CSS,
      },
    }),
    containerStyle: i18n.translate('xpack.canvas.functions.render.args.containerStyleHelpText', {
      defaultMessage: 'The style for the container, including background, border, and opacity.',
    }),
  },
};
