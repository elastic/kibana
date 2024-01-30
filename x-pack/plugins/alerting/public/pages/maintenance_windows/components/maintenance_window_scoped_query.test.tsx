/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { AlertConsumers } from '@kbn/rule-data-utils';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { MaintenanceWindowScopedQuery } from './maintenance_window_scoped_query';

jest.mock('../../../utils/kibana_react');
jest.mock('@kbn/alerts-ui-shared', () => ({
  AlertsSearchBar: () => <div />,
}));

const { useKibana } = jest.requireMock('../../../utils/kibana_react');

describe('MaintenanceWindowScopedQuery', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    useKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addSuccess: jest.fn(),
            addDanger: jest.fn(),
          },
        },
        data: {
          dataViews: {},
        },
        unifiedSearch: {
          ui: {
            SearchBar: <div />,
          },
        },
      },
    });
    appMockRenderer = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRenderer.render(
      <MaintenanceWindowScopedQuery
        featureIds={['observability', 'management', 'securitySolution'] as AlertConsumers[]}
        query={''}
        filters={[]}
        onQueryChange={jest.fn()}
        onFiltersChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('maintenanceWindowScopeQuery')).toBeInTheDocument();
  });

  it('should hide the search bar if isEnabled is false', () => {
    appMockRenderer.render(
      <MaintenanceWindowScopedQuery
        featureIds={['observability', 'management', 'securitySolution'] as AlertConsumers[]}
        isEnabled={false}
        query={''}
        filters={[]}
        onQueryChange={jest.fn()}
        onFiltersChange={jest.fn()}
      />
    );
    expect(screen.queryByTestId('maintenanceWindowScopeQuery')).not.toBeInTheDocument();
  });

  it('should render loading if isLoading is true', () => {
    appMockRenderer.render(
      <MaintenanceWindowScopedQuery
        featureIds={['observability', 'management', 'securitySolution'] as AlertConsumers[]}
        isLoading={true}
        query={''}
        filters={[]}
        onQueryChange={jest.fn()}
        onFiltersChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('maintenanceWindowScopedQueryLoading')).toBeInTheDocument();
  });
});
