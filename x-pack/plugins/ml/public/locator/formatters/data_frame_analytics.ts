/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates URL to the DataFrameAnalytics page
 */
import { isEmpty } from 'lodash';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { formatGenericMlUrl } from './common';
import {
  DataFrameAnalyticsExplorationQueryState,
  DataFrameAnalyticsExplorationUrlState,
  DataFrameAnalyticsUrlState,
  ExplorationPageUrlState,
  MlGenericUrlState,
  MlCommonGlobalState,
} from '../../../common/types/locator';
import { ML_PAGES } from '../../../common/constants/locator';
import { getGroupQueryText, getJobQueryText } from '../../../common/util/string_utils';
import { AppPageState, ListingPageUrlState } from '../../../common/types/common';

export function formatDataFrameAnalyticsJobManagementUrl(
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
export function formatDataFrameAnalyticsExplorationUrl(
  appBasePath: string,
  mlUrlGeneratorState: DataFrameAnalyticsExplorationUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION}`;

  if (mlUrlGeneratorState) {
    const { jobId, analysisType, queryText, globalState } = mlUrlGeneratorState;

    const queryState: DataFrameAnalyticsExplorationQueryState = {
      ml: {
        jobId,
        analysisType,
      },
      ...globalState,
    };

    const appState = {
      [ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION]: {
        ...(queryText ? { queryText } : {}),
      },
    };

    if (!isEmpty(appState[ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION])) {
      url = setStateToKbnUrl<AppPageState<ExplorationPageUrlState>>(
        '_a',
        appState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }

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
 * Creates URL to the DataFrameAnalytics creation wizard
 */
export function formatDataFrameAnalyticsCreateJobUrl(
  appBasePath: string,
  pageState: MlGenericUrlState['pageState']
): string {
  return formatGenericMlUrl(appBasePath, ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB, pageState);
}

/**
 * Creates URL to the DataFrameAnalytics Map page
 */
export function formatDataFrameAnalyticsMapUrl(
  appBasePath: string,
  mlUrlGeneratorState: DataFrameAnalyticsExplorationUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.DATA_FRAME_ANALYTICS_MAP}`;

  if (mlUrlGeneratorState) {
    const { jobId, modelId, analysisType, globalState, queryText } = mlUrlGeneratorState;

    const queryState: DataFrameAnalyticsExplorationQueryState = {
      ml: {
        jobId,
        modelId,
        analysisType,
      },
      ...globalState,
    };

    const appState = {
      [ML_PAGES.DATA_FRAME_ANALYTICS_MAP]: {
        ...(queryText ? { queryText } : {}),
      },
    };

    if (!isEmpty(appState[ML_PAGES.DATA_FRAME_ANALYTICS_MAP])) {
      url = setStateToKbnUrl<AppPageState<ExplorationPageUrlState>>(
        '_a',
        appState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }

    url = setStateToKbnUrl<DataFrameAnalyticsExplorationQueryState>(
      '_g',
      queryState,
      { useHash: false, storeInHashQuery: false },
      url
    );
  }

  return url;
}
