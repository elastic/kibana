/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import '../../../common/mock/match_media';
import '../../../common/mock/react_beautiful_dnd';
import { useMatrixHistogram } from '../../../common/containers/matrix_histogram';
import { waitFor } from '@testing-library/react';
import { mockIndexPattern, TestProviders } from '../../../common/mock';

import { AlertsByCategory } from '.';

jest.mock('../../../common/components/link_to');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/containers/matrix_histogram', () => ({
  useMatrixHistogram: jest.fn(),
}));

const theme = () => ({ eui: { ...euiDarkVars, euiSizeL: '24px' }, darkMode: true });
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
  };
  describe('before loading data', () => {
    beforeAll(async () => {
      (useMatrixHistogram as jest.Mock).mockReturnValue([
        false,
        {
          data: null,
          inspect: false,
          totalCount: null,
        },
      ]);

      wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviders>
            <AlertsByCategory {...testProps} />
          </TestProviders>
        </ThemeProvider>
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
      (useMatrixHistogram as jest.Mock).mockReturnValue([
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
        <ThemeProvider theme={theme}>
          <TestProviders>
            <AlertsByCategory {...testProps} />
          </TestProviders>
        </ThemeProvider>
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
  });
});
