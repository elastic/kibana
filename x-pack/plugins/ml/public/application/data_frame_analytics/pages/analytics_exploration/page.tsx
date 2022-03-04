/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { OutlierExploration } from './components/outlier_exploration';
import { RegressionExploration } from './components/regression_exploration';
import { ClassificationExploration } from './components/classification_exploration';

import { ANALYSIS_CONFIG_TYPE } from '../../../../../common/constants/data_frame_analytics';
import { DataFrameAnalysisConfigType } from '../../../../../common/types/data_frame_analytics';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana } from '../../../contexts/kibana';
import { MlPageHeader } from '../../../components/page_header';
import { AnalyticsIdSelector } from '../components/analytics_selector';

export const Page: FC<{
  jobId: string;
  analysisType: DataFrameAnalysisConfigType;
}> = ({ jobId, analysisType }) => {
  const [analyticsId, setAnalyticsId] =
    useState<{ model_id?: string; job_id?: string; analysis_type?: string }>();
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;
  const jobIdToUse = jobId || analyticsId?.job_id;
  const analysisTypeToUse = analysisType || analyticsId?.analysis_type;

  return (
    <>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.dataframe.analyticsExploration.title"
          defaultMessage="Explore results for Analytics ID {id}"
          values={{ id: jobIdToUse }}
        />
      </MlPageHeader>
      {jobIdToUse && analysisTypeToUse ? (
        <div data-test-subj="mlPageDataFrameAnalyticsExploration">
          {analysisTypeToUse === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && (
            <OutlierExploration jobId={jobIdToUse} />
          )}
          {analysisTypeToUse === ANALYSIS_CONFIG_TYPE.REGRESSION && (
            <RegressionExploration jobId={jobIdToUse} />
          )}
          {analysisTypeToUse === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && (
            <ClassificationExploration jobId={jobIdToUse} />
          )}
        </div>
      ) : (
        <>
          <AnalyticsIdSelector setAnalyticsId={setAnalyticsId} jobsOnly={true} />
          <EuiEmptyPrompt
            iconType="alert"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.ml.dataframe.analyticsMap.noJobSelectedLabel"
                  defaultMessage="No Analytics ID selected"
                />
              </h2>
            }
            data-test-subj="mlNoAnalyticsFound"
          />
        </>
      )}
      <HelpMenu docLink={helpLink} />
    </>
  );
};
