/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { composeScreenshotRef } from '../lib/helper/compose_screenshot_images';
import { ScreenshotRefImageData } from '../../common/runtime_types/ping/synthetics';

/**
 * Checks if two refs are the same. If the ref is unchanged, there's no need
 * to run the expensive draw procedure.
 */
function isNewRef(a: ScreenshotRefImageData, b: ScreenshotRefImageData): boolean {
  if (typeof a === 'undefined' || typeof b === 'undefined') return false;
  const stepA = a.ref.screenshotRef.synthetics.step;
  const stepB = b.ref.screenshotRef.synthetics.step;
  return stepA.index !== stepB.index || stepA.name !== stepB.name;
}

/**
 * Assembles the data for a composite image and returns the composite to a callback.
 * @param imgRef the data and dimensions for the composite image.
 * @param onComposeImageSuccess sends the composited image to this callback.
 * @param imageData this is the composited image value, if it is truthy the function will skip the compositing process
 */
export const useCompositeImage = (
  imgRef: ScreenshotRefImageData,
  onComposeImageSuccess: React.Dispatch<string | undefined>,
  imageData?: string
): void => {
  const [curRef, setCurRef] = React.useState<ScreenshotRefImageData>(imgRef);

  React.useEffect(() => {
    const canvas = document.createElement('canvas');

    async function compose() {
      await composeScreenshotRef(imgRef, canvas);
      const imgData = canvas.toDataURL('image/png', 1.0);
      onComposeImageSuccess(imgData);
    }

    // if the URL is truthy it means it's already been composed, so there
    // is no need to call the function
    if (typeof imageData === 'undefined' || isNewRef(imgRef, curRef)) {
      compose();
      setCurRef(imgRef);
    }
    return () => {
      canvas.parentElement?.removeChild(canvas);
    };
  }, [imgRef, onComposeImageSuccess, curRef, imageData]);
};
