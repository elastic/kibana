/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiCallOut, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ml } from '../../../../../services/ml_api_service';
import { DataFrameAnalyticsConfig } from '../../../../common';
import { EvaluatePanel } from './evaluate_panel';
import { ResultsTable } from './results_table';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { ResultsSearchQuery, defaultSearchQuery } from '../../../../common/analytics';
import { LoadingPanel } from '../loading_panel';
import { getIndexPatternIdFromName } from '../../../../../util/index_utils';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useMlContext } from '../../../../../contexts/ml';
import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';

export const ExplorationTitle: React.FC<{ jobId: string }> = ({ jobId }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.analytics.classificationExploration.tableJobIdTitle', {
        defaultMessage: 'Destination index for classification job ID {jobId}',
        values: { jobId },
      })}
    </span>
  </EuiTitle>
);

const jobConfigErrorTitle = i18n.translate(
  'xpack.ml.dataframe.analytics.classificationExploration.jobConfigurationFetchError',
  {
    defaultMessage:
      'Unable to fetch results. An error occurred loading the job configuration data.',
  }
);

const jobCapsErrorTitle = i18n.translate(
  'xpack.ml.dataframe.analytics.classificationExploration.jobCapsFetchError',
  {
    defaultMessage: "Unable to fetch results. An error occurred loading the index's field data.",
  }
);

interface Props {
  jobId: string;
}

export const ClassificationExploration: FC<Props> = ({ jobId }) => {
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [jobStatus, setJobStatus] = useState<DATA_FRAME_TASK_STATE | undefined>(undefined);
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);
  const [isLoadingJobConfig, setIsLoadingJobConfig] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [jobConfigErrorMessage, setJobConfigErrorMessage] = useState<undefined | string>(undefined);
  const [jobCapsServiceErrorMessage, setJobCapsServiceErrorMessage] = useState<undefined | string>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState<ResultsSearchQuery>(defaultSearchQuery);
  const mlContext = useMlContext();

  const loadJobConfig = async () => {
    setIsLoadingJobConfig(true);
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
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
        setIsLoadingJobConfig(false);
      } else {
        setJobConfigErrorMessage(
          i18n.translate(
            'xpack.ml.dataframe.analytics.classificationExploration.jobConfigurationNoResultsMessage',
            {
              defaultMessage: 'No results found.',
            }
          )
        );
      }
    } catch (e) {
      if (e.message !== undefined) {
        setJobConfigErrorMessage(e.message);
      } else {
        setJobConfigErrorMessage(JSON.stringify(e));
      }
      setIsLoadingJobConfig(false);
    }
  };

  useEffect(() => {
    loadJobConfig();
  }, []);

  const initializeJobCapsService = async () => {
    if (jobConfig !== undefined) {
      try {
        const destIndex = Array.isArray(jobConfig.dest.index)
          ? jobConfig.dest.index[0]
          : jobConfig.dest.index;
        const destIndexPatternId = getIndexPatternIdFromName(destIndex) || destIndex;
        let indexP: IndexPattern | undefined;

        try {
          indexP = await mlContext.indexPatterns.get(destIndexPatternId);
        } catch (e) {
          indexP = undefined;
        }

        if (indexP === undefined) {
          const sourceIndex = jobConfig.source.index[0];
          const sourceIndexPatternId = getIndexPatternIdFromName(sourceIndex) || sourceIndex;
          indexP = await mlContext.indexPatterns.get(sourceIndexPatternId);
        }

        if (indexP !== undefined) {
          setIndexPattern(indexP);
          await newJobCapsService.initializeFromIndexPattern(indexP, false, false);
        }
        setIsInitialized(true);
      } catch (e) {
        if (e.message !== undefined) {
          setJobCapsServiceErrorMessage(e.message);
        } else {
          setJobCapsServiceErrorMessage(JSON.stringify(e));
        }
      }
    }
  };

  useEffect(() => {
    initializeJobCapsService();
  }, [jobConfig && jobConfig.id]);

  if (jobConfigErrorMessage !== undefined || jobCapsServiceErrorMessage !== undefined) {
    return (
      <EuiPanel grow={false}>
        <ExplorationTitle jobId={jobId} />
        <EuiSpacer />
        <EuiCallOut
          title={jobConfigErrorMessage ? jobConfigErrorTitle : jobCapsErrorTitle}
          color="danger"
          iconType="cross"
        >
          <p>{jobConfigErrorMessage ? jobConfigErrorMessage : jobCapsServiceErrorMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <Fragment>
      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && isInitialized === true && (
        <EvaluatePanel jobConfig={jobConfig} jobStatus={jobStatus} searchQuery={searchQuery} />
      )}
      <EuiSpacer />
      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false &&
        jobConfig !== undefined &&
        indexPattern !== undefined &&
        isInitialized === true && (
          <ResultsTable
            jobConfig={jobConfig}
            indexPattern={indexPattern}
            jobStatus={jobStatus}
            setEvaluateSearchQuery={setSearchQuery}
          />
        )}
    </Fragment>
  );
};
