/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';

import '../../../common/mock/match_media';
import '../../../common/mock/react_beautiful_dnd';
import { useMatrixHistogramCombined } from '../../../common/containers/matrix_histogram';
import { waitFor } from '@testing-library/react';
import { mockIndexPattern, TestProviders } from '../../../common/mock';

import { AlertsByCategory } from '.';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';

jest.mock('../../../common/components/link_to');
jest.mock('../../../common/components/visualization_actions', () => ({
  VisualizationActions: jest.fn(() => <div data-test-subj="mock-viz-actions" />),
}));

jest.mock('../../../common/containers/matrix_histogram', () => ({
  useMatrixHistogramCombined: jest.fn(),
}));

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        cases: {
          ui: {
            getCasesContext: jest.fn().mockReturnValue(mockCasesContext),
          },
        },
      },
    }),
  };
});

jest.mock('../../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'mockHost',
      pageName: 'hosts',
      tabName: 'externalAlerts',
    },
  ]),
}));

const from = '2020-03-31T06:00:00.000Z';
const to = '2019-03-31T06:00:00.000Z';

describe('Alerts by category', () => {
  let wrapper: ReactWrapper;
  const testProps = {
    deleteQuery: jest.fn(),
    filters: [],
    from,
    indexNames: [],
    indexPattern: mockIndexPattern,
    setQuery: jest.fn(),
    to,
    query: {
      query: '',
      language: 'kuery',
    },
  };
  describe('before loading data', () => {
    beforeAll(async () => {
      (useMatrixHistogramCombined as jest.Mock).mockReturnValue([
        false,
        {
          data: null,
          inspect: false,
          totalCount: null,
        },
      ]);

      wrapper = mount(
        <TestProviders>
          <AlertsByCategory {...testProps} />
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();
      });
    });

    test('it renders the expected title', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="header-section-title"]').text()).toEqual(
          'External alert trend'
        );
      });
    });

    test('it renders the subtitle (to prevent layout thrashing)', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').exists()).toBe(true);
      });
    });

    test('it renders the expected filter fields', async () => {
      await waitFor(() => {
        const expectedOptions = ['event.category', 'event.module'];

        expectedOptions.forEach((option) => {
          expect(wrapper.find(`option[value="${option}"]`).text()).toEqual(option);
        });
      });
    });

    test('it renders the `View alerts` button', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="view-alerts"]').exists()).toBe(true);
      });
    });

    test('it does NOT render the bar chart when data is not available', async () => {
      await waitFor(() => {
        expect(wrapper.find(`.echChart`).exists()).toBe(false);
      });
    });
  });

  describe('after loading data', () => {
    beforeAll(async () => {
      (useMatrixHistogramCombined as jest.Mock).mockReturnValue([
        false,
        {
          data: [
            { x: 1, y: 2, g: 'g1' },
            { x: 2, y: 4, g: 'g1' },
            { x: 3, y: 6, g: 'g1' },
            { x: 1, y: 1, g: 'g2' },
            { x: 2, y: 3, g: 'g2' },
            { x: 3, y: 5, g: 'g2' },
          ],
          inspect: false,
          totalCount: 6,
        },
      ]);

      wrapper = mount(
        <TestProviders>
          <AlertsByCategory {...testProps} />
        </TestProviders>
      );

      wrapper.update();
    });

    test('it renders the expected subtitle', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="header-panel-subtitle"]').text()).toEqual(
          'Showing: 6 external alerts'
        );
      });
    });

    test('it renders the bar chart when data is available', async () => {
      await waitFor(() => {
        expect(wrapper.find(`.echChart`).exists()).toBe(true);
      });
    });

    test('it shows visualization actions on host page', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(true);
      });
    });

    test('it shows visualization actions on network page', async () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: undefined,
          pageName: 'network',
          tabName: 'external-alerts',
        },
      ]);

      const testWrapper = mount(
        <TestProviders>
          <AlertsByCategory {...testProps} />
        </TestProviders>
      );

      await waitFor(() => {
        testWrapper.update();
      });
      await waitFor(() => {
        expect(testWrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(true);
      });
    });

    test('it does not shows visualization actions on other pages', async () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: undefined,
          pageName: 'overview',
          tabName: undefined,
        },
      ]);
      const testWrapper = mount(
        <TestProviders>
          <AlertsByCategory {...testProps} />
        </TestProviders>
      );

      await waitFor(() => {
        testWrapper.update();
      });

      await waitFor(() => {
        expect(testWrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(false);
      });
    });
  });

  describe('Host page', () => {
    beforeAll(async () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: 'mockHost',
          pageName: 'hosts',
          tabName: 'externalAlerts',
        },
      ]);

      (useMatrixHistogramCombined as jest.Mock).mockReturnValue([
        false,
        {
          data: [
            { x: 1, y: 2, g: 'g1' },
            { x: 2, y: 4, g: 'g1' },
            { x: 3, y: 6, g: 'g1' },
            { x: 1, y: 1, g: 'g2' },
            { x: 2, y: 3, g: 'g2' },
            { x: 3, y: 5, g: 'g2' },
          ],
          inspect: false,
          totalCount: 6,
        },
      ]);

      wrapper = mount(
        <TestProviders>
          <AlertsByCategory {...testProps} />
        </TestProviders>
      );

      wrapper.update();
    });

    test('it shows visualization actions', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(true);
      });
    });
  });

  describe('Network page', () => {
    beforeAll(async () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: undefined,
          pageName: 'network',
          tabName: 'external-alerts',
        },
      ]);
      (useMatrixHistogramCombined as jest.Mock).mockReturnValue([
        false,
        {
          data: [
            { x: 1, y: 2, g: 'g1' },
            { x: 2, y: 4, g: 'g1' },
            { x: 3, y: 6, g: 'g1' },
            { x: 1, y: 1, g: 'g2' },
            { x: 2, y: 3, g: 'g2' },
            { x: 3, y: 5, g: 'g2' },
          ],
          inspect: false,
          totalCount: 6,
        },
      ]);

      wrapper = mount(
        <TestProviders>
          <AlertsByCategory {...testProps} />
        </TestProviders>
      );

      wrapper.update();
    });

    test('it shows visualization actions', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(true);
      });
    });
  });

  describe('Othen than Host or Network page', () => {
    beforeAll(async () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: undefined,
          pageName: 'overview',
          tabName: undefined,
        },
      ]);
      (useMatrixHistogramCombined as jest.Mock).mockReturnValue([
        false,
        {
          data: [
            { x: 1, y: 2, g: 'g1' },
            { x: 2, y: 4, g: 'g1' },
            { x: 3, y: 6, g: 'g1' },
            { x: 1, y: 1, g: 'g2' },
            { x: 2, y: 3, g: 'g2' },
            { x: 3, y: 5, g: 'g2' },
          ],
          inspect: false,
          totalCount: 6,
        },
      ]);

      wrapper = mount(
        <TestProviders>
          <AlertsByCategory {...testProps} />
        </TestProviders>
      );

      wrapper.update();
    });

    test('it does not shows visualization actions', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(false);
      });
    });
  });
});
