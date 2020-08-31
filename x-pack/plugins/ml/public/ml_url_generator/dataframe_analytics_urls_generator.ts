/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Creates URL to the DataFrameAnalytics page
 */
import isEmpty from 'lodash/isEmpty';
import {
  DataFrameAnalyticsExplorationQueryState,
  DataFrameAnalyticsExplorationUrlState,
  DataFrameAnalyticsQueryState,
  DataFrameAnalyticsUrlState,
} from '../../common/types/ml_url_generator';
import { ML_PAGES } from '../../common/constants/ml_url_generator';
import { extractParams } from './common';
import { setStateToKbnUrl } from '../../../../../src/plugins/kibana_utils/public';

export function createDataframeAnalyticsUrl(
  appBasePath: string,
  mlUrlGeneratorState: DataFrameAnalyticsUrlState
): string {
  let url = `${appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE}`;
  const { params } = extractParams<DataFrameAnalyticsUrlState>(mlUrlGeneratorState);

  if (!isEmpty(params)) {
    const { jobId, groupIds } = params;
    const queryState: Partial<DataFrameAnalyticsQueryState> = {
      jobId,
      groupIds,
    };

    url = setStateToKbnUrl<Partial<DataFrameAnalyticsQueryState>>(
      'mlManagement',
      queryState,
      { useHash: false, storeInHashQuery: false },
      url
    );
  }

  return url;
}

/**
 * Creates URL to the DataFrameAnalytics Exploration page
 */
export function createDataframeAnalyticsExplorationUrl(
  appBasePath: string,
  mlUrlGeneratorState: DataFrameAnalyticsExplorationUrlState
): string {
  let url = `${appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION}`;
  const { params } = extractParams<DataFrameAnalyticsExplorationUrlState>(mlUrlGeneratorState);

  if (!isEmpty(params)) {
    const { jobId, analysisType } = params;
    const queryState: DataFrameAnalyticsExplorationQueryState = {
      ml: {
        jobId,
        analysisType,
      },
    };

    url = setStateToKbnUrl<DataFrameAnalyticsExplorationQueryState>(
      '_g',
      queryState,
      { useHash: false, storeInHashQuery: false },
      url
    );
  }

  return url;
}
