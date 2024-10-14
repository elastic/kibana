/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { DashboardRenderer as DashboardContainerRenderer } from '@kbn/dashboard-plugin/public';

import { TestProviders } from '../../common/mock';
import { DashboardRenderer } from './dashboard_renderer';

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: jest.fn().mockReturnValue(<div data-test-subj="dashboardRenderer" />),
  DashboardTopNav: jest.fn().mockReturnValue(<span data-test-subj="dashboardTopNav" />),
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const { queryByTestId } = render(<DashboardRenderer {...props} />, { wrapper: TestProviders });
    expect(queryByTestId(`dashboardRenderer`)).toBeInTheDocument();
  });

  it('renders with correct options', async () => {
    render(<DashboardRenderer {...props} />, { wrapper: TestProviders });
    const options = await (
      DashboardContainerRenderer as unknown as jest.Mock
    ).mock.calls[0][0].getCreationOptions();
    const input = options.getInitialInput();

    expect(input).toEqual(
      expect.objectContaining({
        timeRange: props.timeRange,
        viewMode: ViewMode.VIEW,
        query: undefined,
        filters: undefined,
      })
    );
  });

  it('does not render when No Read Permission', () => {
    const testProps = {
      ...props,
      canReadDashboard: false,
    };
    render(<DashboardRenderer {...testProps} />, {
      wrapper: TestProviders,
    });
    expect(DashboardContainerRenderer).not.toHaveBeenCalled();
  });
});
