/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Creates URL to the DataFrameAnalytics page
 */
import {
  DataFrameAnalyticsExplorationQueryState,
  DataFrameAnalyticsExplorationUrlState,
  DataFrameAnalyticsUrlState,
  MlCommonGlobalState,
} from '../../common/types/ml_url_generator';
import { ML_PAGES } from '../../common/constants/ml_url_generator';
import { setStateToKbnUrl } from '../../../../../src/plugins/kibana_utils/public';
import { getGroupQueryText, getJobQueryText } from '../../common/util/string_utils';
import { AppPageState, ListingPageUrlState } from '../../common/types/common';

export function createDataFrameAnalyticsJobManagementUrl(
  appBasePath: string,
  mlUrlGeneratorState: DataFrameAnalyticsUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE}`;

  if (mlUrlGeneratorState) {
    const { jobId, groupIds, globalState } = mlUrlGeneratorState;
    if (jobId || groupIds) {
      const queryTextArr = [];
      if (jobId) {
        queryTextArr.push(getJobQueryText(jobId));
      }
      if (groupIds) {
        queryTextArr.push(getGroupQueryText(groupIds));
      }
      const jobsListState: Partial<ListingPageUrlState> = {
        ...(queryTextArr.length > 0 ? { queryText: queryTextArr.join(' ') } : {}),
      };

      const queryState: AppPageState<ListingPageUrlState> = {
        [ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE]: jobsListState,
      };

      url = setStateToKbnUrl<AppPageState<ListingPageUrlState>>(
        '_a',
        queryState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }
    if (globalState) {
      url = setStateToKbnUrl<Partial<MlCommonGlobalState>>(
        '_g',
        globalState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }
  }

  return url;
}

/**
 * Creates URL to the DataFrameAnalytics Exploration page
 */
export function createDataFrameAnalyticsExplorationUrl(
  appBasePath: string,
  mlUrlGeneratorState: DataFrameAnalyticsExplorationUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION}`;

  if (mlUrlGeneratorState) {
    const { jobId, analysisType, defaultIsTraining, globalState } = mlUrlGeneratorState;

    const queryState: DataFrameAnalyticsExplorationQueryState = {
      ml: {
        jobId,
        analysisType,
        defaultIsTraining,
      },
      ...globalState,
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

/**
 * Creates URL to the DataFrameAnalytics Map page
 */
export function createDataFrameAnalyticsMapUrl(
  appBasePath: string,
  mlUrlGeneratorState: DataFrameAnalyticsExplorationUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS_MAP}`;

  if (mlUrlGeneratorState) {
    const { jobId, analysisType, defaultIsTraining, globalState } = mlUrlGeneratorState;

    const queryState: DataFrameAnalyticsExplorationQueryState = {
      ml: {
        jobId,
        analysisType,
        defaultIsTraining,
      },
      ...globalState,
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
