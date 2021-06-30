/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import React from 'react';
import { composeScreenshotRef } from '../lib/helper/compose_screenshot_images';
import { ScreenshotRefImageData } from '../../common/runtime_types/ping/synthetics';
import {
  fetchBlocksAction,
  isPendingBlock,
  ScreenshotBlockCache,
  StoreScreenshotBlock,
} from '../state/reducers/synthetics';
import { journeyScreenshotBlockSelector } from '../state/selectors';

function allBlocksLoaded(blocks: { [key: string]: StoreScreenshotBlock }, hashes: string[]) {
  for (const hash of hashes) {
    if (!blocks[hash] || isPendingBlock(blocks[hash])) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if two refs are the same. If the ref is unchanged, there's no need
 * to run the expensive draw procedure.
 */
function isNewRef(a: ScreenshotRefImageData, b: ScreenshotRefImageData): boolean {
  const stepA = a.ref.screenshotRef.synthetics.step;
  const stepB = b.ref.screenshotRef.synthetics.step;
  return stepA.index !== stepB.index || stepA.name !== stepB.name;
}

/**
 * Assembles the data for a composite image and returns the composite to a callback.
 * @param imgRef the data and dimensions for the composite image.
 * @param callback sends the composited image to this callback.
 * @param url this is the composited image value, if it is truthy the function will skip the compositing process
 */
export const useCompositeImage = (
  imgRef: ScreenshotRefImageData,
  onComposeImageSuccess: React.Dispatch<string | undefined>,
  imageData?: string
): void => {
  const dispatch = useDispatch();
  const blocks = useSelector(journeyScreenshotBlockSelector);
  // console.log('blocks size', Object.keys(blocks).length);
  React.useEffect(() => {
    dispatch(
      fetchBlocksAction(imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash))
    );
  }, [dispatch, imgRef.ref.screenshotRef.screenshot_ref.blocks]);

  const [curRef, setCurRef] = React.useState<ScreenshotRefImageData>(imgRef);
  React.useEffect(() => {
    const canvas = document.createElement('canvas');

    async function compose() {
      await composeScreenshotRef(imgRef, canvas, blocks);
      const imgData = canvas.toDataURL('image/jpg', 1.0);
      onComposeImageSuccess(imgData);
    }

    // if the URL is truthy it means it's already been composed, so there
    // is no need to call the function
    // console.log('evaluating ', imgRef.ref.screenshotRef.monitor.check_group);
    if (shouldCompose(imageData, imgRef, curRef, blocks)) {
      compose();
      setCurRef(imgRef);
    }
    return () => {
      canvas.parentElement?.removeChild(canvas);
    };
  }, [blocks, curRef, imageData, imgRef, onComposeImageSuccess]);
};

function shouldCompose(
  imageData: string | undefined,
  imgRef: ScreenshotRefImageData,
  curRef: ScreenshotRefImageData,
  blocks: ScreenshotBlockCache
): boolean {
  return (
    allBlocksLoaded(
      blocks,
      imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash)
    ) &&
    (typeof imageData === 'undefined' || isNewRef(imgRef, curRef))
  );
}
