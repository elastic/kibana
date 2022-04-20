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
import { syntheticsSelector } from '../state/selectors';

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
 *
 * The key fields here are `step.index` and `check_group`, as there's a 1:1 between
 * journey and check group, and each step has a unique index within a journey.
 */
const isNewRef = (
  {
    ref: {
      screenshotRef: {
        synthetics: {
          step: { index: indexA },
        },
        monitor: { check_group: checkGroupA },
      },
    },
  }: ScreenshotRefImageData,
  {
    ref: {
      screenshotRef: {
        synthetics: {
          step: { index: indexB },
        },
        monitor: { check_group: checkGroupB },
      },
    },
  }: ScreenshotRefImageData
): boolean => indexA !== indexB || checkGroupA !== checkGroupB;

export function shouldCompose(
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
  const dispatch = useDispatch();
  const { blocks }: { blocks: ScreenshotBlockCache } = useSelector(syntheticsSelector);

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
    if (shouldCompose(imageData, imgRef, curRef, blocks)) {
      compose();
      setCurRef(imgRef);
    }
    return () => {
      canvas.parentElement?.removeChild(canvas);
    };
  }, [blocks, curRef, imageData, imgRef, onComposeImageSuccess]);
};
