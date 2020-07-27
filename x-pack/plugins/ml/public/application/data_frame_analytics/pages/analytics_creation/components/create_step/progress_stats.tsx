/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../../../contexts/kibana';
import {
  getDataFrameAnalyticsProgressPhase,
  DATA_FRAME_TASK_STATE,
} from '../../../analytics_management/components/analytics_list/common';
import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';
import { ml } from '../../../../../services/ml_api_service';
import { DataFrameAnalyticsId } from '../../../../common/analytics';

export const PROGRESS_REFRESH_INTERVAL_MS = 1000;

export const ProgressStats: FC<{ jobId: DataFrameAnalyticsId }> = ({ jobId }) => {
  const [initialized, setInitialized] = useState<boolean>(false);
  const [failedJobMessage, setFailedJobMessage] = useState<string | undefined>(undefined);
  const [currentProgress, setCurrentProgress] = useState<
    | {
        currentPhase: number;
        progress: number;
        totalPhases: number;
      }
    | undefined
  >(undefined);

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

  if (currentProgress === undefined) return null;

  return (
    <>
      <EuiSpacer />
      {failedJobMessage !== undefined && (
        <>
          <EuiCallOut
            data-test-subj="analyticsWizardProgressCallout"
            title={i18n.translate(
              'xpack.ml.dataframe.analytics.create.analyticsProgressCalloutTitle',
              {
                defaultMessage: 'Job failed',
              }
            )}
            color={'danger'}
            iconType={'alert'}
            size="s"
          >
            <p>{failedJobMessage}</p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiText size="m">
        <strong>
          {i18n.translate('xpack.ml.dataframe.analytics.create.analyticsProgressTitle', {
            defaultMessage: 'Progress',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.ml.dataframe.analytics.create.analyticsProgressPhaseTitle', {
                defaultMessage: 'Phase',
              })}{' '}
              {currentProgress.currentPhase}/{currentProgress.totalPhases}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem style={{ width: '400px' }} grow={false}>
          <EuiProgress
            value={currentProgress.progress}
            max={100}
            color="primary"
            size="l"
            data-test-subj="mlAnalyticsCreationWizardProgress"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{`${currentProgress.progress}%`}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
