/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { LandingPage } from './landing';
import { useKibana } from '../../common/lib/kibana';
import { Router } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { TestProviders } from '../../common/mock/test_providers';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../common/components/landing_page', () => ({
  LandingPageComponent: jest
    .fn()
    .mockReturnValue(<div data-test-subj="default-get-started-page" />),
}));

jest.mock('react-use/lib/useObservable', () => jest.fn((fn) => fn()));

describe('LandingPage', () => {
  const mockGetStartedComponent = jest.fn();
  const history = createBrowserHistory();
  const mockSecuritySolutionTemplateWrapper = jest
    .fn()
    .mockImplementation(({ children }) => <div>{children}</div>);

  const renderPage = () =>
    render(
      <Router history={history}>
        <LandingPage />
      </Router>,
      { wrapper: TestProviders }
    );

  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        securityLayout: {
          getPluginWrapper: jest.fn().mockReturnValue(mockSecuritySolutionTemplateWrapper),
        },
        getStartedComponent$: mockGetStartedComponent,
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders the default component', () => {
    const { queryByTestId } = renderPage();
    expect(queryByTestId('default-get-started-page')).toBeInTheDocument();
  });

  it('renders the get started component', () => {
    mockGetStartedComponent.mockReturnValue(<div data-test-subj="get-started" />);
    const { queryByTestId } = renderPage();

    expect(queryByTestId('default-get-started-page')).not.toBeInTheDocument();
    expect(queryByTestId('get-started')).toBeInTheDocument();
  });
});
