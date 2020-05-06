/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { containerStyle } from '../../../canvas_plugin_src/functions/common/containerStyle';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CSS } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof containerStyle>> = {
  help: i18n.translate('xpack.canvas.functions.containerStyleHelpText', {
    defaultMessage: `Creates an object used for styling an element's container, including background, border, and opacity.`,
  }),
  args: {
    backgroundColor: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundColorHelpText',
      {
        defaultMessage: 'A valid {CSS} background color.',
        values: {
          CSS,
        },
      }
    ),
    backgroundImage: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundImageHelpText',
      {
        defaultMessage: 'A valid {CSS} background image.',
        values: {
          CSS,
        },
      }
    ),
    backgroundRepeat: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundRepeatHelpText',
      {
        defaultMessage: 'A valid {CSS} background repeat.',
        values: {
          CSS,
        },
      }
    ),
    backgroundSize: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundSizeHelpText',
      {
        defaultMessage: 'A valid {CSS} background size.',
        values: {
          CSS,
        },
      }
    ),
    border: i18n.translate('xpack.canvas.functions.containerStyle.args.borderHelpText', {
      defaultMessage: 'A valid {CSS} border.',
      values: {
        CSS,
      },
    }),
    borderRadius: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.borderRadiusHelpText',
      {
        defaultMessage: 'The number of pixels to use when rounding the corners.',
      }
    ),
    opacity: i18n.translate('xpack.canvas.functions.containerStyle.args.opacityHelpText', {
      defaultMessage:
        'A number between 0 and 1 that represents the degree of transparency of the element.',
    }),
    overflow: i18n.translate('xpack.canvas.functions.containerStyle.args.overflowHelpText', {
      defaultMessage: 'A valid {CSS} overflow.',
      values: {
        CSS,
      },
    }),
    padding: i18n.translate('xpack.canvas.functions.containerStyle.args.paddingHelpText', {
      defaultMessage: 'The distance of the content, in pixels, from border.',
    }),
  },
};

export const errors = {
  invalidBackgroundImage: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.containerStyle.invalidBackgroundImageErrorMessage', {
        defaultMessage: 'Invalid backgroundImage. Please provide an asset or a URL.',
      })
    ),
};
