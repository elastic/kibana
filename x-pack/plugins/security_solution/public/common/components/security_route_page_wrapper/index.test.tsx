/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { SecurityRoutePageWrapper } from '.';
import { SecurityPageName } from '../../../../common';
import { TestProviders } from '../../mock';
import { generateHistoryMock } from '../../utils/route/mocks';

const mockUseLinkAuthorized = jest.fn();
const mockUseUpsellingPage = jest.fn();

jest.mock('../../links', () => ({
  useLinkAuthorized: () => mockUseLinkAuthorized(),
}));

jest.mock('../../hooks/use_upselling', () => ({
  useUpsellingPage: () => mockUseUpsellingPage(),
}));

const TEST_COMPONENT_SUBJ = 'test-component';
const TestComponent = () => <div data-test-subj={TEST_COMPONENT_SUBJ} />;
const mockHistory = generateHistoryMock();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <Router history={mockHistory}>
    <TestProviders>{children}</TestProviders>
  </Router>
);

describe('SecurityRoutePageWrapper', () => {
  it('renders children when authorized', () => {
    mockUseLinkAuthorized.mockReturnValue(true);
    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,

      { wrapper: Wrapper }
    );

    expect(getByTestId(TEST_COMPONENT_SUBJ)).toBeInTheDocument();
  });

  it('renders UpsellPage when unauthorized and UpsellPage is available', () => {
    const TestUpsellPage = () => <div data-test-subj={'test-upsell-page'} />;

    mockUseLinkAuthorized.mockReturnValue(false);
    mockUseUpsellingPage.mockReturnValue(TestUpsellPage);
    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,

      { wrapper: Wrapper }
    );

    expect(getByTestId('test-upsell-page')).toBeInTheDocument();
  });

  it('renders NoPrivilegesPage when unauthorized and UpsellPage is unavailable', () => {
    mockUseLinkAuthorized.mockReturnValue(false);
    mockUseUpsellingPage.mockReturnValue(undefined);
    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,

      { wrapper: Wrapper }
    );

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
  });
});

// Write unit test for file /Users/pablo.nevesmachado/workspace/kibana/x-pack/plugins/security_solution/public/common/components/security_route_page_wrapper/index.tsx
