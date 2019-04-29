/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
import { elasticOutline } from '../../lib/elastic_outline';

export const repeatImage = () => ({
  name: 'repeatImage',
  aliases: [],
  type: 'render',
  help: 'Configure a repeating image element',
  context: {
    types: ['number'],
  },
  args: {
    image: {
      types: ['string', 'null'],
      help: 'The image to repeat. Usually a dataURL or an asset',
      default: elasticOutline,
    },
    size: {
      types: ['number'],
      default: 100,
      help:
        'The maximum height or width of the image, in pixels. Eg, if you images is taller than it is wide, this will limit its height',
    },
    max: {
      types: ['number', 'null'],
      help: 'Maximum number of times the image may repeat',
      default: 1000,
    },
    emptyImage: {
      types: ['string', 'null'],
      help: 'Fill the difference between the input and the `max=` parameter with this image',
      default: null,
    },
  },
  fn: (count, args) => {
    return {
      type: 'render',
      as: 'repeatImage',
      value: {
        count: Math.floor(count),
        ...args,
        image: resolveWithMissingImage(args.image, elasticOutline),
        emptyImage: resolveWithMissingImage(args.emptyImage),
      },
    };
  },
});
