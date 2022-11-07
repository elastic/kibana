/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FileImageMetadata } from '@kbn/files-plugin/common';
import { FilesClient, Image } from '@kbn/files-plugin/public';
import { ImageConfig } from '../types';
import { imageEmbeddableFileKind } from '../../common';

export interface ImageViewerContextValue {
  /**
   * A files client that will be retrieve image file by fileId
   */
  filesClient: FilesClient<FileImageMetadata>;
}

export const ImageViewerContext = createContext<ImageViewerContextValue>(
  null as unknown as ImageViewerContextValue
);

const useImageViewerContext = () => {
  const ctx = useContext(ImageViewerContext);
  if (!ctx) {
    throw new Error('ImageViewerContext is not found!');
  }
  return ctx;
};

export function ImageViewer(imageConfig: ImageConfig) {
  const { filesClient } = useImageViewerContext();

  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (imageConfig.src.type === 'url') {
      setSrc(imageConfig.src.url);
    } else {
      setSrc(
        filesClient.getDownloadHref({
          fileKind: imageEmbeddableFileKind.id,
          id: imageConfig.src.fileId,
        })
      );
    }
  }, [filesClient, imageConfig.src]);

  if (!src) return null;

  return (
    <Image src={src} alt={imageConfig.alt ?? ''} style={{ maxWidth: '100%', maxHeight: '100%' }} />
  );
}
