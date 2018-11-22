/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
import { elasticLogo } from '../../lib/elastic_logo';

const modes = ['contain', 'cover', 'stretch'];

export const image = () => ({
  name: 'image',
  aliases: [],
  type: 'image',
  help: 'Display an image',
  context: {
    types: ['null'],
  },
  args: {
    dataurl: {
      // This was accepting dataurl, but there was no facility in fn for checking type and handling a dataurl type.
      types: ['string', 'null'],
      help: 'The HTTP(S) URL or base64 data of an image.',
      aliases: ['_', 'url'],
      default: elasticLogo,
    },
    mode: {
      types: ['string', 'null'],
      help:
        '"contain" will show the entire image, scaled to fit.' +
        '"cover" will fill the container with the image, cropping from the sides or bottom as needed.' +
        '"stretch" will resize the height and width of the image to 100% of the container',
      default: 'contain',
      options: modes,
    },
  },
  fn: (context, { dataurl, mode }) => {
    if (!modes.includes(mode)) throw '"mode" must be "contain", "cover", or "stretch"';

    const modeStyle = mode === 'stretch' ? '100% 100%' : mode;

    return {
      type: 'image',
      mode: modeStyle,
      dataurl: resolveWithMissingImage(dataurl, elasticLogo),
    };
  },
});
