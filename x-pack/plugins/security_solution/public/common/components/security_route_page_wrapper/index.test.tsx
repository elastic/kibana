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
import type { LinkInfo } from '../../links';

const defaultLinkInfo: LinkInfo = {
  id: SecurityPageName.exploreLanding,
  title: 'test',
  path: '/test',
};
const mockGetLink = jest.fn((): LinkInfo | undefined => defaultLinkInfo);
jest.mock('../../links', () => ({
  useLinkInfo: () => mockGetLink(),
}));

const mockUseUpsellingPage = jest.fn();
jest.mock('../../hooks/use_upselling', () => ({
  useUpsellingPage: () => mockUseUpsellingPage(),
}));

const REDIRECT_COMPONENT_SUBJ = 'redirect-component';
const mockRedirect = jest.fn(() => <div data-test-subj={REDIRECT_COMPONENT_SUBJ} />);
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Redirect: () => mockRedirect(),
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
  it('should render children when authorized', () => {
    mockGetLink.mockReturnValueOnce({ ...defaultLinkInfo }); // authorized
    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(TEST_COMPONENT_SUBJ)).toBeInTheDocument();
  });

  it('should render UpsellPage when unauthorized and UpsellPage is available', () => {
    const TestUpsellPage = () => <div data-test-subj={'test-upsell-page'} />;

    mockGetLink.mockReturnValueOnce({ ...defaultLinkInfo, unauthorized: true });
    mockUseUpsellingPage.mockReturnValue(TestUpsellPage);
    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId('test-upsell-page')).toBeInTheDocument();
  });

  it('should render NoPrivilegesPage when unauthorized and UpsellPage is unavailable', () => {
    mockGetLink.mockReturnValueOnce({ ...defaultLinkInfo, unauthorized: true });
    mockUseUpsellingPage.mockReturnValue(undefined);
    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
  });

  it('should redirect when link missing and redirectOnMissing flag present', () => {
    mockGetLink.mockReturnValueOnce(undefined);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding} redirectOnMissing>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(REDIRECT_COMPONENT_SUBJ)).toBeInTheDocument();
  });
});
