/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import { ANALYSIS_CONFIG_TYPE } from '../../../../../common/constants/data_frame_analytics';
import type { DataFrameAnalysisConfigType } from '../../../../../common/types/data_frame_analytics';
import { HelpMenu } from '../../../components/help_menu/help_menu';
import { NavigationMenu } from '../../../components/navigation_menu/navigation_menu';
import { useMlKibana } from '../../../contexts/kibana/kibana_context';
import { ClassificationExploration } from './components/classification_exploration/classification_exploration';
import { OutlierExploration } from './components/outlier_exploration/outlier_exploration';
import { RegressionExploration } from './components/regression_exploration/regression_exploration';

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
