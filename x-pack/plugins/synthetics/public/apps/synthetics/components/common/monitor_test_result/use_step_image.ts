/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import {
  ScreenshotImageBlob,
  ScreenshotRefImageData,
} from '../../../../../../common/runtime_types';
import { getJourneyScreenshot } from '../../../state';

export const useStepImage = ({
  stepStatus,
  hasImage,
  hasIntersected,
  imgPath,
}: {
  imgPath: string;
  stepStatus?: string;
  hasImage: boolean;
  hasIntersected: boolean;
}) => {
  const skippedStep = stepStatus === 'skipped';

  const { data, loading } = useFetcher(() => {
    if (skippedStep) {
      return new Promise<ScreenshotImageBlob | ScreenshotRefImageData | null>((resolve) =>
        resolve(null)
      );
    }

    if (hasIntersected && !hasImage) return getJourneyScreenshot(imgPath);
  }, [hasIntersected, imgPath, skippedStep]);

  return {
    data,
    loading,
  };
};
