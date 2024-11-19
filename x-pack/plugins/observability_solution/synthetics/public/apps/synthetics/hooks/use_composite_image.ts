/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { composeScreenshotRef } from '../utils/monitor_test_result/compose_screenshot_images';
import {
  ScreenshotRefImageData,
  ScreenshotBlockCache,
  StoreScreenshotBlock,
} from '../../../../common/runtime_types';
import { fetchBlocksAction, isPendingBlock } from '../state';
import { selectBrowserJourneyState } from '../state';

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
 * Assembles the data for a composite image and returns the image src and isComposing.
 * @param imgRef the data and dimensions for the composite image.
 */
export const useComposeImageFromRef = (
  imgRef: ScreenshotRefImageData | undefined
): { isComposing: boolean; imgSrc: string | undefined } => {
  const dispatch = useDispatch();
  const { blocks }: { blocks: ScreenshotBlockCache } = useSelector(selectBrowserJourneyState);
  const [isAnyBlockLoading, isAllBlocksLoaded] = useMemo(
    () => [getIsAnyBlockLoading(imgRef, blocks), getIsAllBlocksLoaded(imgRef, blocks)],
    [imgRef, blocks]
  );

  useEffect(() => {
    if (imgRef) {
      dispatch(
        fetchBlocksAction(imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash))
      );
    }
  }, [dispatch, imgRef]);

  const stepRefId =
    imgRef?.stepName ?? imgRef?.ref.screenshotRef.screenshot_ref.blocks[0]?.hash ?? '';
  const uniqueRefId = `${imgRef?.ref.screenshotRef.monitor.check_group}/${stepRefId}`;
  const [composeState, setComposeState] = useState<
    Record<string, { isComposing: boolean; imgSrc: string | undefined }>
  >({});

  const { isComposing, imgSrc } = composeState[uniqueRefId] ?? {
    isComposing: false,
    imgSrc: undefined,
  };

  useEffect(() => {
    if (imgRef) {
      // if the imgSrc is truthy it means it's already been composed, so there
      // is no need to call the function
      if (!isComposing && !imgSrc && isAllBlocksLoaded) {
        setComposeState((prevState) => ({
          ...prevState,
          [uniqueRefId]: { isComposing: true, imgSrc: undefined },
        }));

        const canvas = document.createElement('canvas');
        composeScreenshotRef(imgRef, canvas, blocks).then(() => {
          const dataUrl = canvas.toDataURL('image/jpg', 1.0);
          setComposeState((prevState) => ({
            ...prevState,
            [uniqueRefId]: { isComposing: false, imgSrc: dataUrl },
          }));

          canvas.parentElement?.removeChild(canvas);
        });
      }
    }
  }, [
    blocks,
    imgRef,
    composeState,
    imgSrc,
    isComposing,
    uniqueRefId,
    isAnyBlockLoading,
    isAllBlocksLoaded,
  ]);

  return { isComposing: isComposing || isAnyBlockLoading, imgSrc };
};

function getIsAnyBlockLoading(
  imgRef: ScreenshotRefImageData | undefined,
  blocks: { [key: string]: StoreScreenshotBlock }
) {
  if (!imgRef) {
    return false;
  }

  const hashes = imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash);
  for (const hash of hashes) {
    if (blocks[hash] && isPendingBlock(blocks[hash])) {
      return true;
    }
  }
  return false;
}

function getIsAllBlocksLoaded(
  imgRef: ScreenshotRefImageData | undefined,
  blocks: { [key: string]: StoreScreenshotBlock }
) {
  if (!imgRef) {
    return false;
  }

  const hashes = imgRef.ref.screenshotRef.screenshot_ref.blocks.map(({ hash }) => hash);
  for (const hash of hashes) {
    if (!blocks[hash] || isPendingBlock(blocks[hash])) {
      return false;
    }
  }
  return true;
}
