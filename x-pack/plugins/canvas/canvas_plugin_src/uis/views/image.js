/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { elasticLogo } from '../../lib/elastic_logo';
import { resolveFromArgs } from '../../../common/lib/resolve_dataurl';

export const image = () => ({
  name: 'image',
  displayName: i18n.translate('xpack.canvas.uis.views.imageDisplayName', {
    defaultMessage: 'Image',
  }),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: 'dataurl',
      argType: 'imageUpload',
      resolve({ args }) {
        return { dataurl: resolveFromArgs(args, elasticLogo) };
      },
    },
    {
      name: 'mode',
      displayName: i18n.translate('xpack.canvas.uis.views.image.args.fillModeDisplayName', {
        defaultMessage: 'Fill mode',
      }),
      help: i18n.translate('xpack.canvas.uis.views.image.args.fillModeHelpText', {
        defaultMessage: 'Note: Stretched fill may not work with vector images',
      }),
      argType: 'select',
      options: {
        choices: [
          {
            value: 'contain',
            name: i18n.translate('xpack.canvas.uis.views.image.args.options.choices.containTitle', {
              defaultMessage: 'Contain',
            }),
          },
          {
            value: 'cover',
            name: i18n.translate('xpack.canvas.uis.views.image.args.options.choices.coverTitle', {
              defaultMessage: 'Cover',
            }),
          },
          {
            value: 'stretch',
            name: i18n.translate('xpack.canvas.uis.views.image.args.options.choices.stretchTitle', {
              defaultMessage: 'Stretch',
            }),
          },
        ],
      },
    },
  ],
});
