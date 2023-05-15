/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilesClient } from '@kbn/files-plugin/public';
import { FileImageMetadata } from '@kbn/shared-ux-file-types';
import { GetImageExpressionFunction } from './types';

export interface GetImageArguments {
  id: string;
}

export function getImage(files: () => FilesClient<FileImageMetadata>): GetImageExpressionFunction {
  return {
    name: 'getImage',
    aliases: [],
    type: 'string',
    inputTypes: ['null'],
    help: 'Retrieves saved image',
    args: {
      id: {
        aliases: ['_'],
        types: ['string'],
        help: 'image id',
        required: true,
      },
    },
    async fn(...args) {
      /** Build optimization: prevent adding extra code into initial bundle **/
      const { getImageFn } = await import('./get_image_fn');

      return getImageFn(files)(...args);
    },
  };
}
