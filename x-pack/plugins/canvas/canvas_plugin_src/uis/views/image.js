/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticLogo } from '../../lib/elastic_logo';
import { resolveFromArgs } from '../../../common/lib/resolve_dataurl';

export const image = () => ({
  name: 'image',
  displayName: 'Image',
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
      displayName: 'Fill mode',
      help: 'Note: Stretched fill may not work with vector images',
      argType: 'select',
      options: {
        choices: [
          { value: 'contain', name: 'Contain' },
          { value: 'cover', name: 'Cover' },
          { value: 'stretch', name: 'Stretch' },
        ],
      },
    },
  ],
});
