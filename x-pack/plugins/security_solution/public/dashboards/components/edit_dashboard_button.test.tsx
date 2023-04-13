/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useKibana } from '../../common/lib/kibana';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { TestProviders } from '../../common/mock/test_providers';
import { EditDashboardButton } from './edit_dashboard_button';

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

  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: createStartServicesMock(),
    });
  });

  it('should render', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <EditDashboardButton savedObjectId="mockSavedObjectId" timeRange={timeRange} />
      </TestProviders>
    );
    expect(queryByTestId('dashboardEditButton')).toBeInTheDocument();
  });
});
