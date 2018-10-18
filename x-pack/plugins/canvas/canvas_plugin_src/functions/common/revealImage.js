/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
import { elasticOutline } from '../../lib/elastic_outline';

export const revealImage = () => ({
  name: 'revealImage',
  aliases: [],
  type: 'render',
  help: i18n.translate('xpack.canvas.functions.revealImageHelpText', {
    defaultMessage: 'Configure a image reveal element',
  }),
  context: {
    types: ['number'],
  },
  args: {
    image: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.revealImage.args.imageHelpText', {
        defaultMessage: 'The image to reveal',
      }),
      default: elasticOutline,
    },
    emptyImage: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.revealImage.args.emptyImageHelpText', {
        defaultMessage: 'An optional background image to reveal over',
      }),
      default: null,
    },
    origin: {
      types: ['string'],
      help: i18n.translate('xpack.canvas.functions.revealImage.args.originHelpText', {
        defaultMessage: 'Where to start from. Eg, top, left, bottom or right',
      }),
      default: 'bottom',
    },
  },
  fn: (percent, args) => {
    if (percent > 1 || percent < 0) {
      throw new Error(
        i18n.translate('xpack.canvas.functions.revealImage.inputIsNotBetween0And1ErrorMessage', {
          defaultMessage: 'Where to start from. Eg, top, left, bottom or right',
        })
      );
    }

    return {
      type: 'render',
      as: 'revealImage',
      value: {
        percent,
        ...args,
        image: resolveWithMissingImage(args.image, elasticOutline),
        emptyImage: resolveWithMissingImage(args.emptyImage),
      },
    };
  },
});
