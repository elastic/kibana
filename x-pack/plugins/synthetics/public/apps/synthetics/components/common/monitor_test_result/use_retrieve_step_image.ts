/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useFetcher } from '@kbn/observability-plugin/public';
import {
  ScreenshotImageBlob,
  ScreenshotRefImageData,
} from '../../../../../../common/runtime_types';
import { getJourneyScreenshot } from '../../../state';

type ImageResponse = ScreenshotImageBlob | ScreenshotRefImageData | null;
interface DataResult {
  [imgPath: string]: { attempts: number; data: ImageResponse; loading: boolean };
}

function getUpdatedState(
  prevState: DataResult,
  imgPath: string,
  increment: boolean,
  data?: ImageResponse,
  loading?: boolean
) {
  const newAttempts = (prevState[imgPath]?.attempts ?? 0) + (increment ? 1 : 0);
  const newData = data ?? prevState[imgPath]?.data ?? null;
  const newLoading = loading ?? prevState[imgPath]?.loading ?? false;
  return {
    ...prevState,
    [imgPath]: { attempts: newAttempts, data: newData, loading: newLoading },
  };
}

export const useRetrieveStepImage = ({
  stepStatus,
  hasImage,
  hasIntersected,
  imgPath,
  retryFetchOnRevisit,
}: {
  imgPath: string;
  stepStatus?: string;
  hasImage: boolean;
  hasIntersected: boolean;

  /**
   * Whether to retry screenshot image fetch on revisit (when intersection change triggers).
   * Will only re-fetch if an image fetch wasn't successful in previous attempts.
   * Set this to `true` fro "Run Once" / "Test Now" modes
   */
  retryFetchOnRevisit: boolean;
}) => {
  const [imgState, setImgState] = useState<DataResult>({});

  const skippedStep = stepStatus === 'skipped';

  useFetcher(() => {
    const hasBeenRetriedBefore = (imgState[imgPath]?.attempts ?? 0) > 0;
    const shouldRetry = retryFetchOnRevisit || !hasBeenRetriedBefore;

    if (!skippedStep && hasIntersected && !hasImage && shouldRetry) {
      setImgState((prev) => {
        return getUpdatedState(prev, imgPath, false, undefined, true);
      });
      return getJourneyScreenshot(imgPath)
        .then((resp) => {
          setImgState((prev) => {
            return getUpdatedState(prev, imgPath, true, resp, false);
          });

          return resp;
        })
        .catch(() => {
          setImgState((prev) => {
            return getUpdatedState(prev, imgPath, true, null, false);
          });
        });
    } else {
      return new Promise<ImageResponse>((resolve) => resolve(null));
    }
  }, [skippedStep, hasIntersected, imgPath, retryFetchOnRevisit, hasImage]);

  return imgState[imgPath] ?? { data: null, loading: false };
};
