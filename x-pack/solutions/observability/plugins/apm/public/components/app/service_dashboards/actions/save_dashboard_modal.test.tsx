/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fromKueryExpression } from '@kbn/es-query';
import { renderWithContext } from '../../../../utils/test_helpers';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { SaveDashboardModal } from './save_dashboard_modal';

const mockCallApmApi = jest.fn();

jest.mock('../../../../plugin', () => ({
  ...jest.requireActual('../../../../plugin'),
  getApmInternalServices: () => ({ callApmApi: mockCallApmApi }),
}));

const mockUseDashboardFetcher = jest.fn();
jest.mock('../../../../hooks/use_dashboards_fetcher', () => ({
  useDashboardFetcher: () => mockUseDashboardFetcher(),
}));

const DASHBOARD_TITLE = 'My dashboard';

async function linkDashboard(serviceName: string) {
  renderWithContext(
    <SaveDashboardModal
      onClose={jest.fn()}
      onRefresh={jest.fn()}
      serviceName={serviceName}
      serviceDashboards={[]}
    />
  );

  await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
  await userEvent.click(await screen.findByRole('option', { name: DASHBOARD_TITLE }));
  await userEvent.click(screen.getByTestId('apmSelectDashboardButton'));

  await waitFor(() => expect(mockCallApmApi).toHaveBeenCalled());

  const [endpoint, options] = mockCallApmApi.mock.calls[0];
  expect(endpoint).toBe('POST /internal/apm/custom-dashboard');

  return options.params.body.kuery as string;
}

describe('SaveDashboardModal', () => {
  beforeEach(() => {
    mockCallApmApi.mockReset().mockResolvedValue({});
    mockUseDashboardFetcher.mockReturnValue({
      data: [{ id: 'dashboard-1', data: { title: DASHBOARD_TITLE } }],
      status: FETCH_STATUS.SUCCESS,
    });
  });

  it('stores a quoted service name filter', async () => {
    expect(await linkDashboard('opbeans-java')).toBe('service.name: "opbeans-java"');
  });

  // https://github.com/elastic/kibana/issues/245023
  it('stores a valid KQL filter for a service name containing a colon', async () => {
    const kuery = await linkDashboard('unknown_service:java');

    expect(kuery).toBe('service.name: "unknown_service:java"');
    expect(() => fromKueryExpression(kuery)).not.toThrow();
  });
});
