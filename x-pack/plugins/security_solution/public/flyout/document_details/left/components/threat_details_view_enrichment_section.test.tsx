/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EnrichmentSection } from './threat_details_view_enrichment_section';
import { TestProviders } from '../../../../common/mock';
import {
  THREAT_INTELLIGENCE_ENRICHMENTS_TITLE_TEST_ID,
  THREAT_INTELLIGENCE_LOADING_ENRICHMENTS_TEST_ID,
  THREAT_INTELLIGENCE_NO_ENRICHMENTS_FOUND_TEST_ID,
} from './test_ids';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';

describe('EnrichmentSection', () => {
  it('should render no data views for indicator match rule type', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EnrichmentSection enrichments={undefined} type={ENRICHMENT_TYPES.IndicatorMatchRule} />
      </TestProviders>
    );

    expect(getByTestId(THREAT_INTELLIGENCE_NO_ENRICHMENTS_FOUND_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(THREAT_INTELLIGENCE_NO_ENRICHMENTS_FOUND_TEST_ID)).toHaveTextContent(
      'This alert does not have threat intelligence.'
    );
  });

  it('should render no data views for other types', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EnrichmentSection enrichments={undefined} type={ENRICHMENT_TYPES.InvestigationTime} />
      </TestProviders>
    );

    expect(getByTestId(THREAT_INTELLIGENCE_NO_ENRICHMENTS_FOUND_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(THREAT_INTELLIGENCE_NO_ENRICHMENTS_FOUND_TEST_ID)).toHaveTextContent(
      "Additional threat intelligence wasn't found within the selected time frame"
    );
  });

  it('should render title for indicator match rule type', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EnrichmentSection enrichments={[]} type={ENRICHMENT_TYPES.IndicatorMatchRule} />
      </TestProviders>
    );

    expect(getByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_TITLE_TEST_ID)).toHaveTextContent(
      'Threat match detected'
    );
  });

  it('should render title for other types', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EnrichmentSection enrichments={[]} type={ENRICHMENT_TYPES.InvestigationTime} />
      </TestProviders>
    );

    expect(getByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_TITLE_TEST_ID)).toHaveTextContent(
      'Enriched with threat intelligence'
    );
  });

  it('should render children props', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EnrichmentSection enrichments={undefined}>
          <div data-test-subj="test-child" />
        </EnrichmentSection>
      </TestProviders>
    );

    expect(getByTestId('test-child')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EnrichmentSection enrichments={undefined} loading={true} />
      </TestProviders>
    );

    expect(getByTestId(THREAT_INTELLIGENCE_LOADING_ENRICHMENTS_TEST_ID)).toBeInTheDocument();
  });
});
