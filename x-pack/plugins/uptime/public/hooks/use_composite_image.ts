/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { composeScreenshotRef } from '../lib/helper/compose_screenshot_images';
import { ScreenshotRefImageData } from '../../common/runtime_types';

export const useCompositeImage = (
  imgRef: ScreenshotRefImageData,
  callback: React.Dispatch<string | undefined>,
  url?: string
) => {
  React.useEffect(() => {
    const canvas = document.createElement('canvas');

    async function compose() {
      await composeScreenshotRef(imgRef, canvas);
      const imgData = canvas.toDataURL('image/jpg', 1.0);
      callback(imgData);
    }

    if (typeof url === 'undefined') {
      compose();
    }
    return () => {
      canvas.parentElement?.removeChild(canvas);
    };
  }, [imgRef, callback, url]);
};
