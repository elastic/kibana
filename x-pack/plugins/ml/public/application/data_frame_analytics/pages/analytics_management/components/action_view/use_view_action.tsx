/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { ML_PAGES } from '../../../../../../../common/constants/locator';
import type { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';
import { getAnalysisType } from '../../../../../../../common/util/analytics_utils';
import { useMlLocator } from '../../../../../contexts/kibana/use_create_url';
import { useNavigateToPath } from '../../../../../contexts/kibana/use_navigate_to_path';
import type {
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';
import { getViewLinkStatus } from './get_view_link_status';
import { viewActionButtonText, ViewButton } from './view_button';

export type ViewAction = ReturnType<typeof useViewAction>;
export const useViewAction = () => {
  const mlLocator = useMlLocator()!;
  const navigateToPath = useNavigateToPath();

  const redirectToTab = async (jobId: string, analysisType: DataFrameAnalysisConfigType) => {
    const path = await mlLocator.getUrl({
      page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
      pageState: { jobId, analysisType },
    });

    await navigateToPath(path, false);
  };

  const clickHandler = useCallback((item: DataFrameAnalyticsListRow) => {
    const analysisType = getAnalysisType(item.config.analysis) as DataFrameAnalysisConfigType;
    redirectToTab(item.id, analysisType);
  }, []);

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      isPrimary: true,
      name: (item: DataFrameAnalyticsListRow) => <ViewButton item={item} />,
      enabled: (item: DataFrameAnalyticsListRow) => !getViewLinkStatus(item).disabled,
      description: viewActionButtonText,
      icon: 'visTable',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'mlAnalyticsJobViewButton',
    }),
    [clickHandler]
  );

  return { action };
};
