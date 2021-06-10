/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import React from 'react';
import { composeScreenshotRef } from '../lib/helper/compose_screenshot_images';
import { ScreenshotRefImageData } from '../../common/runtime_types';
import { journeyScreenshotBlockSelector } from '../state/selectors';
import {
  fetchBlocksAction,
  isPendingBlock,
  StoreScreenshotBlock,
} from '../state/reducers/synthetics';

function allBlocksLoaded(blocks: { [key: string]: StoreScreenshotBlock }, hashes: string[]) {
  for (const hash of hashes) {
    if (!blocks[hash] || isPendingBlock(blocks[hash])) {
      return false;
    }
  }
  return true;
}

export const useCompositeImage = (
  imgRef: ScreenshotRefImageData,
  callback: React.Dispatch<string | undefined>,
  url?: string
) => {
  const dispatch = useDispatch();
  const blocks = useSelector(journeyScreenshotBlockSelector);
  console.log('blocks', blocks);
  React.useEffect(() => {
    dispatch(
      fetchBlocksAction(imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash))
    );
  }, [dispatch, imgRef.ref.screenshotRef.screenshot_ref.blocks]);
  React.useEffect(() => {
    const canvas = document.createElement('canvas');

    async function compose() {
      await composeScreenshotRef(imgRef, canvas, blocks);
      const imgData = canvas.toDataURL('image/jpg', 1.0);
      callback(imgData);
    }

    if (
      typeof url === 'undefined' &&
      allBlocksLoaded(
        blocks,
        imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash)
      )
    ) {
      compose();
    }
    return () => {
      canvas.parentElement?.removeChild(canvas);
    };
  }, [imgRef, callback, url, blocks]);
};
