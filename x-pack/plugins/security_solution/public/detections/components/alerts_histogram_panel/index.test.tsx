/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { shallow, mount } from 'enzyme';

import '../../../common/mock/match_media';
import { esQuery } from '../../../../../../../src/plugins/data/public';
import { TestProviders } from '../../../common/mock';
import { SecurityPageName } from '../../../app/types';

import { AlertsHistogramPanel, buildCombinedQueries, parseCombinedQueries } from './index';
import * as helpers from './helpers';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    createHref: jest.fn(),
    useHistory: jest.fn(),
  };
});

const mockNavigateToApp = jest.fn();
jest.mock('../../../common/lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../../common/lib/kibana/kibana_react');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: jest.fn(),
        },
        uiSettings: {
          get: jest.fn(),
        },
      },
    }),
  };
});

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');
  return {
    ...original,
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

jest.mock('../../../common/components/navigation/use_get_url_search');

describe('AlertsHistogramPanel', () => {
  const defaultProps = {
    from: '2020-07-07T08:20:18.966Z',
    signalIndexName: 'signalIndexName',
    setQuery: jest.fn(),
    to: '2020-07-08T08:20:18.966Z',
    updateDateRange: jest.fn(),
  };

  it('renders correctly', () => {
    const wrapper = shallow(<AlertsHistogramPanel {...defaultProps} />);

    expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBeTruthy();
  });

  describe('Button view alerts', () => {
    it('renders correctly', () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = shallow(<AlertsHistogramPanel {...props} />);

      expect(
        wrapper.find('[data-test-subj="alerts-histogram-panel-go-to-alerts-page"]').exists()
      ).toBeTruthy();
    });

    it('when click we call navigateToApp to make sure to navigate to right page', () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = shallow(<AlertsHistogramPanel {...props} />);

      wrapper
        .find('[data-test-subj="alerts-histogram-panel-go-to-alerts-page"]')
        .simulate('click', {
          preventDefault: jest.fn(),
        });

      expect(mockNavigateToApp).toBeCalledWith('securitySolution', {
        deepLinkId: SecurityPageName.alerts,
        path: '',
      });
    });
  });

  describe('Count table', () => {
    it('renders Graph and Count tabs', async () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} showCountTable />
        </TestProviders>
      );

      await waitFor(() => {
        expect(wrapper.find('TabTitle').exists()).toBeTruthy();
        expect(
          wrapper.find('[data-test-subj="stepAboutDetailsToggleGraph"]').exists()
        ).toBeTruthy();
        expect(
          wrapper.find('[data-test-subj="stepAboutDetailsToggleCount"]').exists()
        ).toBeTruthy();
      });
    });

    it('renders alert count table when count tab is clicked', async () => {
      const props = { ...defaultProps, showLinkToAlerts: true };

      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...props} showCountTable />
          </TestProviders>
        );
        wrapper.find('button[data-test-subj="stepAboutDetailsToggleCount"]').simulate('click');

        await waitFor(() => {
          wrapper.update();
          expect(wrapper.find('AlertsCount').exists()).toBeTruthy();
        });
      });
    });
  });

  describe('Query', () => {
    it('it render with a illegal KQL', async () => {
      const spyOnBuildEsQuery = jest.spyOn(esQuery, 'buildEsQuery');
      spyOnBuildEsQuery.mockImplementation(() => {
        throw new Error('Something went wrong');
      });
      const props = { ...defaultProps, query: { query: 'host.name: "', language: 'kql' } };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBeTruthy();
      });
    });
  });

  describe('CombinedQueries', () => {
    jest.mock('./helpers');
    const mockGetAlertsHistogramQuery = jest.spyOn(helpers, 'getAlertsHistogramQuery');
    beforeEach(() => {
      mockGetAlertsHistogramQuery.mockReset();
    });

    it('combinedQueries props is valid, alerts query include combinedQueries', async () => {
      const props = {
        ...defaultProps,
        query: { query: 'host.name: "', language: 'kql' },
        combinedQueries:
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"exists":{"field":"process.name"}}],"should":[],"must_not":[]}}',
      };
      mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(mockGetAlertsHistogramQuery.mock.calls[0]).toEqual([
          'signal.rule.name',
          false,
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
        ]);
      });
    });
  });

  describe('parseCombinedQueries', () => {
    it('return empty object when variables is undefined', async () => {
      expect(parseCombinedQueries(undefined)).toEqual({});
    });

    it('return empty object when variables is empty string', async () => {
      expect(parseCombinedQueries('')).toEqual({});
    });

    it('return empty object when variables is NOT a valid stringify json object', async () => {
      expect(parseCombinedQueries('hello world')).toEqual({});
    });

    it('return a valid json object when variables is a valid json stringify', async () => {
      expect(
        parseCombinedQueries(
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
      expect(buildCombinedQueries(undefined)).toEqual([]);
    });

    it('return empty array when variables is empty string', async () => {
      expect(buildCombinedQueries('')).toEqual([]);
    });

    it('return array with empty object when variables is NOT a valid stringify json object', async () => {
      expect(buildCombinedQueries('hello world')).toEqual([{}]);
    });

    it('return a valid json object when variables is a valid json stringify', async () => {
      expect(
        buildCombinedQueries(
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
});
