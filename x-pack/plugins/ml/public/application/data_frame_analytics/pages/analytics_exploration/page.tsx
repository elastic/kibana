/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
} from '@elastic/eui';

import { NavigationMenu } from '../../../components/navigation_menu';

import { OutlierExploration } from './components/outlier_exploration';
import { RegressionExploration } from './components/regression_exploration';
import { ClassificationExploration } from './components/classification_exploration';

import { ANALYSIS_CONFIG_TYPE } from '../../../../../common/constants/data_frame_analytics';
import { DataFrameAnalysisConfigType } from '../../../../../common/types/data_frame_analytics';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana } from '../../../contexts/kibana';

export const Page: FC<{
  jobId: string;
  analysisType: DataFrameAnalysisConfigType;
}> = ({ jobId, analysisType }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;
  return (
    <>
      <NavigationMenu tabId="data_frame_analytics" />
      <EuiPage data-test-subj="mlPageDataFrameAnalyticsExploration">
        <EuiPageBody style={{ maxWidth: 'calc(100% - 0px)' }}>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h1>{jobId}</h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody style={{ maxWidth: 'calc(100% - 0px)' }}>
            {analysisType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && (
              <OutlierExploration jobId={jobId} />
            )}
            {analysisType === ANALYSIS_CONFIG_TYPE.REGRESSION && (
              <RegressionExploration jobId={jobId} />
            )}
            {analysisType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && (
              <ClassificationExploration jobId={jobId} />
            )}
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
      <HelpMenu docLink={helpLink} />
    </>
  );
};
