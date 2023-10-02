/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { DashboardView } from '.';
import { useCapabilities } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { ViewMode } from '@kbn/embeddable-plugin/public';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: jest.fn().mockReturnValue({ detailName: 'mockSavedObjectId' }),
  };
});

jest.mock('../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../common/lib/kibana');
  return {
    ...actual,
    useCapabilities: jest.fn().mockReturnValue({ show: true, showWriteControls: true }),
  };
});

jest.mock('../../components/dashboard_renderer', () => ({
  DashboardRenderer: jest
    .fn()
    .mockImplementation((props) => (
      <div data-test-subj={`dashboard-view-${props.savedObjectId}`} />
    )),
}));

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
};

describe('DashboardView', () => {
  beforeEach(() => {
    (useCapabilities as unknown as jest.Mock).mockReturnValue({
      show: true,
      showWriteControls: true,
    });
  });
  test('render when no error state', () => {
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={ViewMode.VIEW} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-mockSavedObjectId`)).toBeInTheDocument();
  });

  test('render a prompt when error state exists', () => {
    (useCapabilities as unknown as jest.Mock).mockReturnValue({
      show: false,
      showWriteControls: true,
    });
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={ViewMode.VIEW} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-mockSavedObjectId`)).not.toBeInTheDocument();
    expect(queryByTestId(`dashboard-view-error-prompt-wrapper`)).toBeInTheDocument();
  });

  test('render dashboard view with height', () => {
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={ViewMode.VIEW} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-wrapper`)).toHaveStyle({
      'min-height': `calc(100vh - 140px)`,
    });
  });
});
