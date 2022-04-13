/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act } from '@testing-library/react';
import { mount } from 'enzyme';

import type { Filter } from '@kbn/es-query';
import { TestProviders } from '../../../../common/mock';
import { SecurityPageName } from '../../../../app/types';
import { MatrixLoader } from '../../../../common/components/matrix_histogram/matrix_loader';

import { AlertsHistogramPanel } from './index';
import * as helpers from './helpers';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

jest.mock('../../../../common/containers/query_toggle');

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    createHref: jest.fn(),
    useHistory: jest.fn(),
    useLocation: jest.fn().mockReturnValue({ pathname: '' }),
  };
});

const mockNavigateToApp = jest.fn();
jest.mock('../../../../common/lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../../../common/lib/kibana/kibana_react');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: jest.fn(),
        },
        data: {
          search: {
            search: jest.fn(),
          },
        },
        uiSettings: {
          get: jest.fn(),
        },
        notifications: {
          toasts: {
            addWarning: jest.fn(),
            addError: jest.fn(),
            addSuccess: jest.fn(),
          },
        },
      },
    }),
  };
});

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

jest.mock('../../../../common/components/navigation/use_get_url_search');

jest.mock('../../../containers/detection_engine/alerts/use_query', () => {
  const original = jest.requireActual('../../../containers/detection_engine/alerts/use_query');
  return {
    ...original,
    useQueryAlerts: jest.fn().mockReturnValue({
      loading: true,
      setQuery: () => undefined,
      data: null,
      response: '',
      request: '',
      refetch: null,
    }),
  };
});

describe('AlertsHistogramPanel', () => {
  const defaultProps = {
    signalIndexName: 'signalIndexName',
    setQuery: jest.fn(),
    updateDateRange: jest.fn(),
  };

  const mockSetToggle = jest.fn();
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  beforeEach(() => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mount(
      <TestProviders>
        <AlertsHistogramPanel {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBeTruthy();
    wrapper.unmount();
  });

  describe('Button view alerts', () => {
    it('renders correctly', () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="alerts-histogram-panel-go-to-alerts-page"]').exists()
      ).toBeTruthy();
      wrapper.unmount();
    });

    it('when click we call navigateToApp to make sure to navigate to right page', () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      wrapper
        .find('button[data-test-subj="alerts-histogram-panel-go-to-alerts-page"]')
        .simulate('click', {
          preventDefault: jest.fn(),
        });

      expect(mockNavigateToApp).toBeCalledWith('securitySolutionUI', {
        deepLinkId: SecurityPageName.alerts,
        path: '',
      });
      wrapper.unmount();
    });
  });

  describe('Query', () => {
    it('it render with a illegal KQL', async () => {
      await act(async () => {
        jest.mock('@kbn/es-query', () => ({
          buildEsQuery: jest.fn().mockImplementation(() => {
            throw new Error('Something went wrong');
          }),
        }));
        const props = { ...defaultProps, query: { query: 'host.name: "', language: 'kql' } };
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...props} />
          </TestProviders>
        );

        await waitFor(() => {
          expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBeTruthy();
        });
        wrapper.unmount();
      });
    });
  });

  describe('CombinedQueries', () => {
    it('combinedQueries props is valid, alerts query include combinedQueries', async () => {
      const mockGetAlertsHistogramQuery = jest.spyOn(helpers, 'getAlertsHistogramQuery');

      const props = {
        ...defaultProps,
        query: { query: 'host.name: "', language: 'kql' },
        combinedQueries:
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"exists":{"field":"process.name"}}],"should":[],"must_not":[]}}',
      };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockGetAlertsHistogramQuery.mock.calls[0]).toEqual([
          'kibana.alert.rule.name',
          '2020-07-07T08:20:18.966Z',
          '2020-07-08T08:20:18.966Z',
          [
            {
              bool: {
                filter: [{ match_all: {} }, { exists: { field: 'process.name' } }],
                must: [],
                must_not: [],
                should: [],
              },
            },
          ],
          undefined,
        ]);
      });
      wrapper.unmount();
    });
  });

  describe('Filters', () => {
    it('filters props is valid, alerts query include filter', async () => {
      const mockGetAlertsHistogramQuery = jest.spyOn(helpers, 'getAlertsHistogramQuery');
      const statusFilter: Filter = {
        meta: {
          alias: null,
          disabled: false,
          key: 'kibana.alert.workflow_status',
          negate: false,
          params: {
            query: 'open',
          },
          type: 'phrase',
        },
        query: {
          term: {
            'kibana.alert.workflow_status': 'open',
          },
        },
      };

      const props = {
        ...defaultProps,
        query: { query: '', language: 'kql' },
        filters: [statusFilter],
      };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockGetAlertsHistogramQuery.mock.calls[1]).toEqual([
          'kibana.alert.rule.name',
          '2020-07-07T08:20:18.966Z',
          '2020-07-08T08:20:18.966Z',
          [
            {
              bool: {
                filter: [{ term: { 'kibana.alert.workflow_status': 'open' } }],
                must: [],
                must_not: [],
                should: [],
              },
            },
          ],
          undefined,
        ]);
      });
      wrapper.unmount();
    });
  });

  describe('parseCombinedQueries', () => {
    it('return empty object when variables is undefined', async () => {
      expect(helpers.parseCombinedQueries(undefined)).toEqual({});
    });

    it('return empty object when variables is empty string', async () => {
      expect(helpers.parseCombinedQueries('')).toEqual({});
    });

    it('return empty object when variables is NOT a valid stringify json object', async () => {
      expect(helpers.parseCombinedQueries('hello world')).toEqual({});
    });

    it('return a valid json object when variables is a valid json stringify', async () => {
      expect(
        helpers.parseCombinedQueries(
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"exists":{"field":"process.name"}}],"should":[],"must_not":[]}}'
        )
      ).toMatchInlineSnapshot(`
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "match_all": Object {},
                },
                Object {
                  "exists": Object {
                    "field": "process.name",
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          }
      `);
    });
  });

  describe('buildCombinedQueries', () => {
    it('return empty array when variables is undefined', async () => {
      expect(helpers.buildCombinedQueries(undefined)).toEqual([]);
    });

    it('return empty array when variables is empty string', async () => {
      expect(helpers.buildCombinedQueries('')).toEqual([]);
    });

    it('return array with empty object when variables is NOT a valid stringify json object', async () => {
      expect(helpers.buildCombinedQueries('hello world')).toEqual([{}]);
    });

    it('return a valid json object when variables is a valid json stringify', async () => {
      expect(
        helpers.buildCombinedQueries(
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"exists":{"field":"process.name"}}],"should":[],"must_not":[]}}'
        )
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "match_all": Object {},
                },
                Object {
                  "exists": Object {
                    "field": "process.name",
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          },
        ]
      `);
    });
  });

  describe('toggleQuery', () => {
    it('toggles', async () => {
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} />
          </TestProviders>
        );
        wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
        expect(mockSetToggle).toBeCalledWith(false);
      });
    });
    it('toggleStatus=true, render', async () => {
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} />
          </TestProviders>
        );

        expect(wrapper.find(MatrixLoader).exists()).toEqual(true);
      });
    });
    it('toggleStatus=false, hide', async () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} />
          </TestProviders>
        );
        expect(wrapper.find(MatrixLoader).exists()).toEqual(false);
      });
    });
  });
});
