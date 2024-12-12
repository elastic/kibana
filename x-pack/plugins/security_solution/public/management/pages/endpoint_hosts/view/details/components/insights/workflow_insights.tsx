/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { WorkflowInsightsResults } from './workflow_insights_results';
import { WorkflowInsightsScanSection } from './workflow_insights_scan';
import { useIsExperimentalFeatureEnabled } from '../../../../../../../common/hooks/use_experimental_features';
import { WORKFLOW_INSIGHTS } from '../../../translations';

export const WorkflowInsights = () => {
  const isWorkflowInsightsEnabled = useIsExperimentalFeatureEnabled('defendInsights');

  if (!isWorkflowInsightsEnabled) {
    return null;
  }

  const results = null;

  const renderLastResultsCaption = () => {
    if (!results) {
      return null;
    }
    return (
      <EuiText color={'subdued'} size={'xs'}>
        {WORKFLOW_INSIGHTS.titleRight}
      </EuiText>
    );
  };

  return (
    <>
      <EuiAccordion
        id={'workflow-insights-wrapper'}
        buttonContent={
          <EuiText size={'m'}>
            <h4>{WORKFLOW_INSIGHTS.title}</h4>
          </EuiText>
        }
        initialIsOpen
        extraAction={renderLastResultsCaption()}
        paddingSize={'none'}
      >
        <EuiSpacer size={'m'} />
        <WorkflowInsightsScanSection />
        <EuiSpacer size={'m'} />
        <WorkflowInsightsResults results={true} />
        <EuiHorizontalRule />
      </EuiAccordion>
      <EuiSpacer size="l" />
    </>
  );
};
