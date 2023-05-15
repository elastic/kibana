/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultFileKind } from '@kbn/files-plugin/common';
import { FilesClient } from '@kbn/files-plugin/public';
import { FileImageMetadata } from '@kbn/shared-ux-file-types';
import { GetImageExpressionFunction } from './types';

export const getImageFn =
  (files: () => FilesClient<FileImageMetadata>): GetImageExpressionFunction['fn'] =>
  async (input, { id }, context) => {
    const savedImage = await files().getDownloadHref({ id, fileKind: DefaultFileKind.kind.id });
    console.log({ savedImage });
    if (savedImage !== undefined) {
      return savedImage;
    }

    throw new Error(`Couldn't find image id ${id}`);
  };
