/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { containerStyle } from '../../functions/common/containerStyle';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof containerStyle>> = {
  help: i18n.translate('xpack.canvas.functions.containerStyleHelpText', {
    defaultMessage:
      'Creates an object used for describing the properties of a series on a chart. You would usually use this inside of a charting function',
  }),
  args: {
    border: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage: 'Valid CSS border string',
    }),
    borderRadius: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage: 'Number of pixels to use when rounding the border',
    }),
    padding: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage: 'Content distance in pixels from border',
    }),
    backgroundColor: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage: 'Valid CSS background color string',
    }),
    backgroundImage: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage: 'Valid CSS background image string',
    }),
    backgroundSize: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage: 'Valid CSS background size string',
    }),
    backgroundRepeat: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage: 'Valid CSS background repeat string',
    }),
    opacity: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage:
        'A number between 0 and 1 representing the degree of transparency of the element',
    }),
    overflow: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
      defaultMessage: '',
    }),
  },
};
