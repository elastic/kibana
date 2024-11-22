/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { useIsExperimentalFeatureEnabled } from '../../../../../../../common/hooks/use_experimental_features';
import { EndpointInsightsResults } from './endpoint_insights_results';
import { ENDPOINT_INSIGHTS } from '../../../translations';
import { EndpointInsightsScanSection } from './endpoint_insights_scan';

export const EndpointInsights = () => {
  const isEndpointInsightsEnabled = useIsExperimentalFeatureEnabled('defendInsights');

  if (!isEndpointInsightsEnabled) {
    return null;
  }

  const results = null;

  const renderLastResultsCaption = () => {
    if (!results) {
      return null;
    }
    return (
      <EuiText color={'subdued'} size={'xs'}>
        {ENDPOINT_INSIGHTS.titleRight}
      </EuiText>
    );
  };

  return (
    <>
      <EuiAccordion
        id={'endpoint-insights-wrapper'}
        buttonContent={
          <EuiText size={'m'}>
            <h4>{ENDPOINT_INSIGHTS.title}</h4>
          </EuiText>
        }
        initialIsOpen
        extraAction={renderLastResultsCaption()}
        paddingSize={'none'}
      >
        <EuiSpacer size={'m'} />
        <EndpointInsightsScanSection />
        <EuiSpacer size={'m'} />
        <EndpointInsightsResults />
        <EuiHorizontalRule />
      </EuiAccordion>
      <EuiSpacer size="l" />
    </>
  );
};
