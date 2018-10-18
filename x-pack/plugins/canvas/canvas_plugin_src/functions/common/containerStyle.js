/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isValid } from '../../../common/lib/url';

export const containerStyle = () => ({
  name: 'containerStyle',
  aliases: [],
  context: {
    types: ['null'],
  },
  type: 'containerStyle',
  help: i18n.translate('xpack.canvas.functions.containerStyleHelpText', {
    defaultMessage:
      'Creates an object used for describing the properties of a series on a chart. You would usually use this inside of a charting function',
  }),
  args: {
    border: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.borderHelpText', {
        defaultMessage: 'Valid CSS border string',
      }),
    },
    borderRadius: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.borderRadiusHelpText', {
        defaultMessage: 'Number of pixels to use when rounding the border',
      }),
    },
    padding: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.paddingHelpText', {
        defaultMessage: 'Content distance in pixels from border',
      }),
    },
    backgroundColor: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.backgroundColorHelpText', {
        defaultMessage: 'Valid CSS background color string',
      }),
    },
    backgroundImage: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.backgroundImageHelpText', {
        defaultMessage: 'Valid CSS background image string',
      }),
    },
    backgroundSize: {
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.backgroundSizeHelpText', {
        defaultMessage: 'Valid CSS background size string',
      }),
      default: 'contain',
    },
    backgroundRepeat: {
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.backgroundRepeatHelpText', {
        defaultMessage: 'Valid CSS background repeat string',
      }),
      default: 'no-repeat',
    },
    opacity: {
      types: ['number', 'null'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.opacityHelpText', {
        defaultMessage:
          'A number between 0 and 1 representing the degree of transparency of the element',
      }),
    },
    overflow: {
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.containerStyle.args.overflowHelpText', {
        defaultMessage: 'Sets overflow of the container',
      }),
    },
  },
  fn: (context, args) => {
    const { backgroundImage, backgroundSize, backgroundRepeat, ...remainingArgs } = args;
    const style = {
      type: 'containerStyle',
      ...remainingArgs,
    };

    if (backgroundImage) {
      if (!isValid(backgroundImage)) {
        throw new Error(
          i18n.translate(
            'xpack.canvas.functions.containerStyle.invalidBackgroundImageErrorMessage',
            {
              defaultMessage: 'Invalid backgroundImage. Please provide an asset or a URL.',
            }
          )
        );
      }
      style.backgroundImage = `url(${backgroundImage})`;
      style.backgroundSize = backgroundSize;
      style.backgroundRepeat = backgroundRepeat;
    }

    // removes keys with undefined value
    return JSON.parse(JSON.stringify(style));
  },
});
