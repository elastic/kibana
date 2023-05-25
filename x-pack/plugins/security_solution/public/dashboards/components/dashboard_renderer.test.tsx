/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../common/mock';
import { DashboardRenderer } from './dashboard_renderer';

jest.mock('@kbn/dashboard-plugin/public', () => {
  const actual = jest.requireActual('@kbn/dashboard-plugin/public');
  return {
    ...actual,
    DashboardRenderer: jest
      .fn()
      .mockImplementation(() => <div data-test-subj="dashboardRenderer" />),
  };
});

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: jest.fn().mockReturnValue({
      detailName: '2d50f100-be6f-11ed-964a-ffa67304840e',
    }),
  };
});

describe('DashboardRenderer', () => {
  const props = {
    canReadDashboard: true,
    id: 'dashboard-savedObjectId',
    savedObjectId: 'savedObjectId',
    timeRange: {
      from: '2023-03-10T00:00:00.000Z',
      to: '2023-03-10T23:59:59.999Z',
    },
  };

  it('renders', () => {
    const { queryByTestId } = render(<DashboardRenderer {...props} />, { wrapper: TestProviders });
    expect(queryByTestId(`dashboardRenderer`)).toBeInTheDocument();
  });

  it.skip('does not render when No Read Permission', () => {
    const testProps = {
      ...props,
      canReadDashboard: false,
    };
    const { queryByTestId } = render(<DashboardRenderer {...testProps} />, {
      wrapper: TestProviders,
    });
    expect(queryByTestId(`dashboardRenderer`)).not.toBeInTheDocument();
  });
});
