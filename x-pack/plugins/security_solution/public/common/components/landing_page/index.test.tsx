/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { LandingPageComponent } from '.';
import { useKibana } from '../../lib/kibana';
import { Router } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { TestProviders } from '../../mock/test_providers';

jest.mock('../../lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('react-use/lib/useObservable', () => jest.fn((component) => component));

describe('LandingPageComponent', () => {
  const mockGetComponent = jest.fn();
  const history = createBrowserHistory();
  const mockSecuritySolutionTemplateWrapper = jest
    .fn()
    .mockImplementation(({ children }) => <div>{children}</div>);

  const renderPage = () =>
    render(
      <Router history={history}>
        <LandingPageComponent />
      </Router>,
      { wrapper: TestProviders }
    );

  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        securityLayout: {
          getPluginWrapper: jest.fn().mockReturnValue(mockSecuritySolutionTemplateWrapper),
        },
        getComponent$: mockGetComponent,
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the get started component', () => {
    mockGetComponent.mockReturnValue(<div data-test-subj="get-started" />);
    const { queryByTestId } = renderPage();

    expect(queryByTestId('get-started')).toBeInTheDocument();
  });
});
