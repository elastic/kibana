/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ContextualServiceMapSectionProps } from '../../service_map/contextual_map/contextual_service_map_section';
import { ServiceOverviewServiceMapSection } from '.';

let sectionProps: ContextualServiceMapSectionProps | null = null;

const mockUseApmServiceContext = jest.fn();
jest.mock('../../../../context/apm_service/use_apm_service_context', () => ({
  useApmServiceContext: () => mockUseApmServiceContext(),
}));

const mockUseApmParams = jest.fn();
jest.mock('../../../../hooks/use_apm_params', () => ({
  useApmParams: () => mockUseApmParams(),
}));

jest.mock('../../service_map/contextual_map/contextual_service_map_section', () => ({
  ContextualServiceMapSection: (props: ContextualServiceMapSectionProps) => {
    sectionProps = props;
    return <div data-test-subj="mockContextualServiceMapSection" />;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  sectionProps = null;
  mockUseApmServiceContext.mockReturnValue({
    serviceName: 'opbeans-java',
    transactionType: 'request',
  });
  mockUseApmParams.mockReturnValue({
    query: {
      environment: 'production',
      kuery: '',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    },
  });
});

describe('ServiceOverviewServiceMapSection', () => {
  it("hands the page's transaction type to the flyout opened from the map", () => {
    render(<ServiceOverviewServiceMapSection />);

    expect(sectionProps?.flyoutOptions).toEqual({ transactionType: 'request' });
  });

  it('leaves the transaction type unset when the page has not resolved one', () => {
    mockUseApmServiceContext.mockReturnValue({
      serviceName: 'opbeans-java',
      transactionType: undefined,
    });

    render(<ServiceOverviewServiceMapSection />);

    expect(sectionProps?.flyoutOptions).toEqual({ transactionType: undefined });
  });

  it('renders nothing without a service name or time range', () => {
    mockUseApmServiceContext.mockReturnValue({ serviceName: '', transactionType: 'request' });

    const { container } = render(<ServiceOverviewServiceMapSection />);

    expect(container).toBeEmptyDOMElement();
  });
});
