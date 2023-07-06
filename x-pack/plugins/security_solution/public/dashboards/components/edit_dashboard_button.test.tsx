/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderResult } from '@testing-library/react';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import type { Query } from '@kbn/es-query';

import { useKibana } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock/test_providers';
import type { EditDashboardButtonComponentProps } from './edit_dashboard_button';
import { EditDashboardButton } from './edit_dashboard_button';
import { ViewMode } from '@kbn/embeddable-plugin/public';

jest.mock('../../common/lib/kibana/kibana_react', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe('EditDashboardButton', () => {
  const timeRange = {
    from: '2023-03-24T00:00:00.000Z',
    to: '2023-03-24T23:59:59.999Z',
  };

  const props = {
    filters: [],
    query: { query: '', language: '' } as Query,
    savedObjectId: 'mockSavedObjectId',
    timeRange,
  };
  const servicesMock = {
    dashboard: { locator: { getRedirectUrl: jest.fn() } },
    application: {
      navigateToApp: jest.fn(),
      navigateToUrl: jest.fn(),
    },
  };

  const renderButton = (testProps: EditDashboardButtonComponentProps) => {
    return render(
      <TestProviders>
        <EditDashboardButton {...testProps} />
      </TestProviders>
    );
  };

  let renderResult: RenderResult;
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: servicesMock,
    });
    renderResult = renderButton(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    expect(renderResult.queryByTestId('dashboardEditButton')).toBeInTheDocument();
  });

  it('should render dashboard edit url', () => {
    fireEvent.click(renderResult.getByTestId('dashboardEditButton'));
    expect(servicesMock.dashboard?.locator?.getRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: props.query,
        filters: props.filters,
        timeRange: props.timeRange,
        dashboardId: props.savedObjectId,
        viewMode: ViewMode.EDIT,
      })
    );
  });
});
