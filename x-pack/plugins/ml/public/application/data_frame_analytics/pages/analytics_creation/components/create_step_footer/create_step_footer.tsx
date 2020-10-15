/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  getDataFrameAnalyticsProgressPhase,
  DATA_FRAME_TASK_STATE,
} from '../../../analytics_management/components/analytics_list/common';
import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';
import { useMlKibana } from '../../../../../contexts/kibana';
import { ml } from '../../../../../services/ml_api_service';
import { BackToListPanel } from '../back_to_list_panel';
import { ViewResultsPanel } from '../view_results_panel';
import { ProgressStats } from './progress_stats';
import { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';

export const PROGRESS_REFRESH_INTERVAL_MS = 1000;

interface Props {
  jobId: string;
  jobType: DataFrameAnalysisConfigType;
  showProgress: boolean;
}

export interface AnalyticsProgressStats {
  currentPhase: number;
  progress: number;
  totalPhases: number;
}

export const CreateStepFooter: FC<Props> = ({ jobId, jobType, showProgress }) => {
  const [initialized, setInitialized] = useState<boolean>(false);
  const [failedJobMessage, setFailedJobMessage] = useState<string | undefined>(undefined);
  const [jobFinished, setJobFinished] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<AnalyticsProgressStats | undefined>(
    undefined
  );

  const {
    services: { notifications },
  } = useMlKibana();

  useEffect(() => {
    setInitialized(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const analyticsStats = await ml.dataFrameAnalytics.getDataFrameAnalyticsStats(jobId);
        const jobStats = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
          ? analyticsStats.data_frame_analytics[0]
          : undefined;

        if (jobStats !== undefined) {
          const progressStats = getDataFrameAnalyticsProgressPhase(jobStats);

          if (jobStats.state === DATA_FRAME_TASK_STATE.FAILED) {
            clearInterval(interval);
            setFailedJobMessage(
              jobStats.failure_reason ||
                i18n.translate(
                  'xpack.ml.dataframe.analytics.create.analyticsProgressCalloutMessage',
                  {
                    defaultMessage: 'Analytics job {jobId} has failed.',
                    values: { jobId },
                  }
                )
            );
          }

          setCurrentProgress(progressStats);
          if (
            (progressStats.currentPhase === progressStats.totalPhases &&
              progressStats.progress === 100) ||
            jobStats.state === DATA_FRAME_TASK_STATE.STOPPED
          ) {
            clearInterval(interval);
            // Check job has started. Jobs that fail to start will also have STOPPED state
            setJobFinished(
              progressStats.currentPhase === progressStats.totalPhases &&
                progressStats.progress === 100
            );
          }
        } else {
          clearInterval(interval);
        }
      } catch (e) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.ml.dataframe.analytics.create.analyticsProgressErrorMessage', {
            defaultMessage: 'An error occurred getting progress stats for analytics job {jobId}',
            values: { jobId },
          })
        );
        clearInterval(interval);
      }
    }, PROGRESS_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [initialized]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        {showProgress && (
          <ProgressStats currentProgress={currentProgress} failedJobMessage={failedJobMessage} />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <BackToListPanel />
          </EuiFlexItem>
          {jobFinished === true && (
            <EuiFlexItem grow={false}>
              <ViewResultsPanel jobId={jobId} analysisType={jobType} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
