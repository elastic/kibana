/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
import { elasticOutline } from '../../lib/elastic_outline';

export const revealImage = () => ({
  name: 'revealImage',
  aliases: [],
  type: 'render',
  help: 'Configure a image reveal element',
  context: {
    types: ['number'],
  },
  args: {
    image: {
      types: ['string', 'null'],
      help: 'The image to reveal',
      default: elasticOutline,
    },
    emptyImage: {
      types: ['string', 'null'],
      help: 'An optional background image to reveal over',
      default: null,
    },
    origin: {
      types: ['string'],
      help: 'Where to start from. Eg, top, left, bottom or right',
      default: 'bottom',
      options: ['top', 'left', 'bottom', 'right'],
    },
  },
  fn: (percent, args) => {
    if (percent > 1 || percent < 0) throw new Error('input must be between 0 and 1');

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
