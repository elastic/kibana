/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getElasticLogo, resolveFromArgs } from '@kbn/presentation-util-plugin/common/lib';
import { ViewStrings } from '../../../i18n';

const { Image: strings } = ViewStrings;

export const image = () => {
  return {
    name: 'image',
    displayName: strings.getDisplayName(),
    modelArgs: [],
    requiresContext: false,
    args: [
      {
        name: 'dataurl',
        argType: 'imageUpload',
        resolve: async ({ args }) => {
          const { elasticLogo } = await getElasticLogo();
          return { dataurl: resolveFromArgs(args, elasticLogo) };
        },
      },
      {
        name: 'mode',
        displayName: strings.getModeDisplayName(),
        help: strings.getModeHelp(),
        argType: 'select',
        options: {
          choices: [
            { value: 'contain', name: strings.getContainMode() },
            { value: 'cover', name: strings.getCoverMode() },
            { value: 'stretch', name: strings.getStretchMode() },
          ],
        },
      },
    ],
  };
};
