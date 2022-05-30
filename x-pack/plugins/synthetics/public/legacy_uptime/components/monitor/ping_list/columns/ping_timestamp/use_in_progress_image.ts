/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRouteMatch } from 'react-router-dom';
import { useEffect } from 'react';
import { useFetcher } from '@kbn/observability-plugin/public';
import {
  ScreenshotImageBlob,
  ScreenshotRefImageData,
} from '../../../../../../../common/runtime_types';
import { getJourneyScreenshot } from '../../../../../state/api/journey';
import { MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE } from '../../../../../../../common/constants';
import { useUptimeRefreshContext } from '../../../../../contexts/uptime_refresh_context';

export const useInProgressImage = ({
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
  const isAddRoute = useRouteMatch(MONITOR_ADD_ROUTE);
  const isEditRoute = useRouteMatch(MONITOR_EDIT_ROUTE);

  const { lastRefresh, refreshApp } = useUptimeRefreshContext();

  const { data, loading } = useFetcher(() => {
    if (stepStatus === 'skipped') {
      return new Promise<ScreenshotImageBlob | ScreenshotRefImageData | null>((resolve) =>
        resolve(null)
      );
    }

    if (hasIntersected && !hasImage) return getJourneyScreenshot(imgPath);
  }, [hasIntersected, imgPath, stepStatus, lastRefresh]);

  useEffect(() => {
    if (!loading && !hasImage && (isAddRoute?.isExact || isEditRoute?.isExact)) {
      setTimeout(() => {
        refreshApp();
      }, 5 * 1000);
    }
  }, [hasImage, loading, refreshApp, lastRefresh, isAddRoute?.isExact, isEditRoute?.isExact]);

  return {
    data,
    loading,
  };
};
