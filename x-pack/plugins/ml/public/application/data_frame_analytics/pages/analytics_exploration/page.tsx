/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

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

export const Page: FC<{
  jobId: string;
  analysisType: DataFrameAnalysisConfigType;
  defaultIsTraining?: boolean;
}> = ({ jobId, analysisType, defaultIsTraining }) => (
  <Fragment>
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
            <RegressionExploration jobId={jobId} defaultIsTraining={defaultIsTraining} />
          )}
          {analysisType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && (
            <ClassificationExploration jobId={jobId} defaultIsTraining={defaultIsTraining} />
          )}
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  </Fragment>
);
