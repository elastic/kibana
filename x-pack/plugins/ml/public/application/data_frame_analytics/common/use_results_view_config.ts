/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { IndexPattern } from '../../../../../../../src/plugins/data/public';

import { extractErrorMessage } from '../../../../common/util/errors';

import { getIndexPatternIdFromName } from '../../util/index_utils';
import { ml } from '../../services/ml_api_service';
import { newJobCapsService } from '../../services/new_job_capabilities_service';
import { useMlContext } from '../../contexts/ml';

import { DataFrameAnalyticsConfig } from '../common';

import { isGetDataFrameAnalyticsStatsResponseOk } from '../pages/analytics_management/services/analytics_service/get_analytics';
import { DATA_FRAME_TASK_STATE } from '../pages/analytics_management/components/analytics_list/common';
import { useInferenceApiService } from '../../services/ml_api_service/inference';
import { TotalFeatureImportance } from '../../../../common/types/feature_importance';
import { getToastNotificationService } from '../../services/toast_notification_service';
import {
  isClassificationAnalysis,
  isRegressionAnalysis,
} from '../../../../common/util/analytics_utils';

export const useResultsViewConfig = (jobId: string) => {
  const mlContext = useMlContext();
  const inferenceApiService = useInferenceApiService();

  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [needsDestIndexPattern, setNeedsDestIndexPattern] = useState<boolean>(false);
  const [isLoadingJobConfig, setIsLoadingJobConfig] = useState<boolean>(false);
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [jobCapsServiceErrorMessage, setJobCapsServiceErrorMessage] = useState<undefined | string>(
    undefined
  );
  const [jobConfigErrorMessage, setJobConfigErrorMessage] = useState<undefined | string>(undefined);
  const [jobStatus, setJobStatus] = useState<DATA_FRAME_TASK_STATE | undefined>(undefined);

  const [totalFeatureImportance, setTotalFeatureImportance] = useState<
    TotalFeatureImportance[] | undefined
  >(undefined);

  // get analytics configuration, index pattern and field caps
  useEffect(() => {
    (async function () {
      setIsLoadingJobConfig(false);

      try {
        const analyticsConfigs = await ml.dataFrameAnalytics.getDataFrameAnalytics(jobId);

        const analyticsStats = await ml.dataFrameAnalytics.getDataFrameAnalyticsStats(jobId);
        const stats = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
          ? analyticsStats.data_frame_analytics[0]
          : undefined;

        if (stats !== undefined && stats.state) {
          setJobStatus(stats.state);
        }

        if (
          Array.isArray(analyticsConfigs.data_frame_analytics) &&
          analyticsConfigs.data_frame_analytics.length > 0
        ) {
          const jobConfigUpdate = analyticsConfigs.data_frame_analytics[0];
          // don't fetch the total feature importance if it's outlier_detection
          if (
            isClassificationAnalysis(jobConfigUpdate.analysis) ||
            isRegressionAnalysis(jobConfigUpdate.analysis)
          ) {
            try {
              const inferenceModels = await inferenceApiService.getInferenceModel(`${jobId}*`, {
                include: 'total_feature_importance',
              });
              const inferenceModel = inferenceModels.find(
                (model) => model.metadata?.analytics_config?.id === jobId
              );
              if (
                Array.isArray(inferenceModel?.metadata?.total_feature_importance) === true &&
                inferenceModel?.metadata?.total_feature_importance.length > 0
              ) {
                setTotalFeatureImportance(inferenceModel?.metadata?.total_feature_importance);
              }
            } catch (e) {
              getToastNotificationService().displayErrorToast(e);
            }
          }

          try {
            const destIndex = Array.isArray(jobConfigUpdate.dest.index)
              ? jobConfigUpdate.dest.index[0]
              : jobConfigUpdate.dest.index;
            const destIndexPatternId = getIndexPatternIdFromName(destIndex) || destIndex;
            let indexP: IndexPattern | undefined;

            try {
              indexP = await mlContext.indexPatterns.get(destIndexPatternId);
            } catch (e) {
              indexP = undefined;
            }

            if (indexP === undefined) {
              setNeedsDestIndexPattern(true);
              const sourceIndex = jobConfigUpdate.source.index[0];
              const sourceIndexPatternId = getIndexPatternIdFromName(sourceIndex) || sourceIndex;
              indexP = await mlContext.indexPatterns.get(sourceIndexPatternId);
            }

            if (indexP !== undefined) {
              await newJobCapsService.initializeFromIndexPattern(indexP, false, false);
              setJobConfig(analyticsConfigs.data_frame_analytics[0]);
              setIndexPattern(indexP);
              setIsInitialized(true);
              setIsLoadingJobConfig(false);
            }
          } catch (e) {
            setJobCapsServiceErrorMessage(extractErrorMessage(e));
            setIsLoadingJobConfig(false);
          }
        }
      } catch (e) {
        setJobConfigErrorMessage(extractErrorMessage(e));
        setIsLoadingJobConfig(false);
      }
    })();
  }, []);

  return {
    indexPattern,
    isInitialized,
    isLoadingJobConfig,
    jobCapsServiceErrorMessage,
    jobConfig,
    jobConfigErrorMessage,
    jobStatus,
    needsDestIndexPattern,
    totalFeatureImportance,
  };
};
