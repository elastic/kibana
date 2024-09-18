/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { Filter } from '@kbn/es-query';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { useLoadRuleTypesQuery } from '../../hooks/use_load_rule_types_query';
import { useRuleAADFields } from '../../hooks/use_rule_aad_fields';
import { AlertsSearchBar } from './alerts_search_bar';

const mockDataPlugin = dataPluginMock.createStartContract();
jest.mock('../../hooks/use_load_rule_types_query');
jest.mock('../../hooks/use_rule_aad_fields');
jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view');
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        data: mockDataPlugin,
        unifiedSearch: {
          ui: {
            SearchBar: jest.fn().mockImplementation((props) => (
              <button
                data-test-subj="querySubmitButton"
                onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
                type="button"
              >
                {'Hello world'}
              </button>
            )),
          },
        },
        notifications: { toasts: { addWarning: jest.fn() } } as unknown as NotificationsStart,
      },
    }),
  };
});
jest.mocked(useAlertsDataView).mockReturnValue({
  isLoading: false,
  dataView: {
    title: '.alerts-*',
    fields: [
      {
        name: 'event.action',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
});

jest.mocked(useLoadRuleTypesQuery).mockReturnValue({
  ruleTypesState: {
    initialLoad: false,
    data: new Map(),
    isLoading: false,
    error: undefined,
  },
  authorizedToReadAnyRules: false,
  hasAnyAuthorizedRuleType: false,
  authorizedRuleTypes: [],
  authorizedToCreateAnyRules: false,
  isSuccess: false,
});

jest.mocked(useRuleAADFields).mockReturnValue({
  aadFields: [],
  loading: false,
});

describe('AlertsSearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        initialFilters={[]}
        onFiltersUpdated={jest.fn()}
        onSavedQueryUpdated={jest.fn()}
        onClearSavedQuery={jest.fn()}
        appName={'test'}
        featureIds={['observability', 'stackAlerts']}
      />
    );
    expect(screen.getByTestId('querySubmitButton')).toBeInTheDocument();
  });

  it('renders initial filters correctly', () => {
    const filters = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'custom',
          key: 'query',
        },
        query: { match_phrase: { 'host.name': 'testValue' } },
        $state: { store: 'appState' },
      },
    ] as Filter[];

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        initialFilters={filters}
        onFiltersUpdated={jest.fn()}
        onSavedQueryUpdated={jest.fn()}
        onClearSavedQuery={jest.fn()}
        appName={'test'}
        featureIds={['observability', 'stackAlerts']}
      />
    );

    expect(mockDataPlugin.query.filterManager.addFilters).toHaveBeenCalledWith(filters);
  });
});
