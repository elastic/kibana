/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { TestProviders } from '../../mock';

import { MIN_LEGEND_HEIGHT, DraggableLegend } from './draggable_legend';
import { LegendItem } from './draggable_legend_item';

const theme = () => ({ eui: euiDarkVars, darkMode: true });

const allOthersDataProviderId =
  'draggable-legend-item-527adabe-8e1c-4a1f-965c-2f3d65dda9e1-event_dataset-All others';

const legendItems: LegendItem[] = [
  {
    color: '#1EA593',
    dataProviderId: 'draggable-legend-item-3207fda7-d008-402a-86a0-8ad632081bad-event_dataset-flow',
    field: 'event.dataset',
    value: 'flow',
  },
  {
    color: '#2B70F7',
    dataProviderId:
      'draggable-legend-item-83f6c824-811d-4ec8-b373-eba2b0de6398-event_dataset-suricata_eve',
    field: 'event.dataset',
    value: 'suricata.eve',
  },
  {
    color: '#CE0060',
    dataProviderId:
      'draggable-legend-item-ec57bb8f-82cd-4e07-bd38-1d11b3f0ee5f-event_dataset-traefik_access',
    field: 'event.dataset',
    value: 'traefik.access',
  },
  {
    color: '#38007E',
    dataProviderId:
      'draggable-legend-item-25d5fcd6-87ba-46b5-893e-c655d7d504e3-event_dataset-esensor',
    field: 'event.dataset',
    value: 'esensor',
  },
  {
    color: '#F37020',
    dataProviderId: allOthersDataProviderId,
    field: 'event.dataset',
    value: 'All others',
  },
];

describe('DraggableLegend', () => {
  const height = 400;

  // Suppress warnings about "react-beautiful-dnd"
  /* eslint-disable no-console */
  const originalError = console.error;
  const originalWarn = console.warn;
  beforeAll(() => {
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  describe('rendering', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviders>
            <DraggableLegend height={height} legendItems={legendItems} />
          </TestProviders>
        </ThemeProvider>
      );
    });

    it(`renders a container with the specified non-zero 'height'`, () => {
      expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
        'height',
        `${height}px`
      );
    });

    it('scrolls when necessary', () => {
      expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
        'overflow',
        'auto'
      );
    });

    it('renders the legend items', () => {
      legendItems.forEach((item) =>
        expect(
          wrapper
            .find(
              item.dataProviderId !== allOthersDataProviderId
                ? `[data-test-subj="legend-item-${item.dataProviderId}"]`
                : '[data-test-subj="all-others-legend-item"]'
            )
            .first()
            .text()
        ).toEqual(item.value)
      );
    });

    it('renders a spacer for every legend item', () => {
      expect(wrapper.find('[data-test-subj="draggable-legend-spacer"]').hostNodes().length).toEqual(
        legendItems.length
      );
    });
  });

  it('does NOT render the legend when an empty collection of legendItems is provided', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviders>
          <DraggableLegend height={height} legendItems={[]} />
        </TestProviders>
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="draggable-legend"]').exists()).toBe(false);
  });

  it(`renders a legend with the minimum height when 'height' is zero`, () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviders>
          <DraggableLegend height={0} legendItems={legendItems} />
        </TestProviders>
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
      'height',
      `${MIN_LEGEND_HEIGHT}px`
    );
  });
});
