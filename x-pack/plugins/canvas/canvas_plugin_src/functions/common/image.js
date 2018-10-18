/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { includes } from 'lodash';
import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
import { elasticLogo } from '../../lib/elastic_logo';

export const image = () => ({
  name: 'image',
  aliases: [],
  type: 'image',
  help: i18n.translate('xpack.canvas.functions.imageHelpText', {
    defaultMessage: 'Display an image',
  }),
  context: {
    types: ['null'],
  },
  args: {
    dataurl: {
      // This was accepting dataurl, but there was no facility in fn for checking type and handling a dataurl type.
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.image.args.dataurlHelpText', {
        defaultMessage: 'The HTTP(S) URL or base64 data of an image.',
      }),
      aliases: ['_', 'url'],
      default: elasticLogo,
    },
    mode: {
      types: ['string', 'null'],
      help: i18n.translate('xpack.canvas.functions.image.args.modeHelpText', {
        defaultMessage:
          '"{contain}" will show the entire image, scaled to fit. "{cover}" will fill the container with the image, cropping from the sides or bottom as needed. "{stretch}" will resize the height and width of the image to 100% of the container',
        values: {
          contain: 'contain',
          cover: 'cover',
          stretch: 'stretch',
        },
      }),
      default: 'contain',
    },
  },
  fn: (context, { dataurl, mode }) => {
    if (!includes(['contain', 'cover', 'stretch'], mode))
      throw '"mode" must be "contain", "cover", or "stretch"';

    const modeStyle = mode === 'stretch' ? '100% 100%' : mode;

    return {
      type: 'image',
      mode: modeStyle,
      dataurl: resolveWithMissingImage(dataurl, elasticLogo),
    };
  },
});
