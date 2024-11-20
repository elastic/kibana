/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import { useIsExperimentalFeatureEnabled } from '../../../../../../../common/hooks/use_experimental_features';
import { EndpointInsightsResults } from './endpoint_insights_results';
import { ENDPOINT_INSIGHTS } from '../../../translations';
import { EndpointInsightsScan } from './endpoint_insights_scan';
import { useKibana } from '../../../../../../../common/lib/kibana';

export const EndpointInsights = () => {
  const isEndpointInsightsEnabled = useIsExperimentalFeatureEnabled('defendInsights');
  const { http } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });
  const configureConnectors = !(aiConnectors && aiConnectors[0] && aiConnectors[0].id);

  if (!isEndpointInsightsEnabled) {
    return null;
  }

  return (
    <>
      <EuiAccordion
        id={'endpoint-insights-wrapper'}
        buttonContent={
          <EuiText size={'m'}>
            <strong>{ENDPOINT_INSIGHTS.sectionTitle}</strong>
          </EuiText>
        }
        initialIsOpen
        extraAction={
          <EuiText color={'subdued'} size={'xs'}>
            {ENDPOINT_INSIGHTS.sectionTitleRight}
          </EuiText>
        }
        paddingSize={'none'}
      >
        <EuiSpacer size={'m'} />
        <EndpointInsightsScan configureConnectors={configureConnectors} />
        <EuiSpacer size={'m'} />
        <EndpointInsightsResults results={!configureConnectors} />
        <EuiHorizontalRule />
      </EuiAccordion>
      <EuiSpacer size={'m'} />
    </>
  );
};
