/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { waitFor } from '@testing-library/react';

import { TimelineId } from '../../../../common/types';
import '../../mock/match_media';
import { TestProviders, mockIndexPattern } from '../../mock';

import { allEvents, defaultOptions } from './helpers';
import { TopN, Props as TopNProps } from './top_n';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../lib/kibana');
jest.mock('../link_to');
jest.mock('../visualization_actions', () => ({
  VisualizationActions: jest.fn(() => <div data-test-subj="mock-viz-actions" />),
}));

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

const field = 'host.name';
const value = 'nice';
const combinedQueries = {
  bool: {
    must: [],
    filter: [
      {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [{ match_phrase: { 'network.transport': 'tcp' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: { should: [{ exists: { field: 'host.name' } }], minimum_should_match: 1 },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [{ range: { '@timestamp': { gte: 1586824450493 } } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ range: { '@timestamp': { lte: 1586910850493 } } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      { match_phrase: { 'source.port': { query: '30045' } } },
    ],
    should: [],
    must_not: [],
  },
};

describe('TopN', () => {
  const query = { query: '', language: 'kuery' };

  const toggleTopN = jest.fn();
  const eventTypes: { [id: string]: TopNProps['defaultView'] } = {
    raw: 'raw',
    alert: 'alert',
    all: 'all',
  };
  let testProps: TopNProps = {
    defaultView: eventTypes.raw,
    field,
    filters: [],
    from: '2020-04-14T00:31:47.695Z',
    indexPattern: mockIndexPattern,
    options: defaultOptions,
    query,
    setAbsoluteRangeDatePickerTarget: 'global',
    setQuery: jest.fn(),
    to: '2020-04-15T00:31:47.695Z',
    toggleTopN,
    value,
  };
  describe('common functionality', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      wrapper = mount(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
    });

    test('it invokes the toggleTopN function when the close button is clicked', () => {
      wrapper.find('[data-test-subj="close"]').first().simulate('click');
      wrapper.update();

      expect(toggleTopN).toHaveBeenCalled();
    });
  });

  describe('view selection', () => {
    const detectionAlertsTimelines = [
      TimelineId.detectionsPage,
      TimelineId.detectionsRulesDetailsPage,
    ];

    const nonDetectionAlertTables = [
      TimelineId.hostsPageEvents,
      TimelineId.hostsPageExternalAlerts,
      TimelineId.networkPageExternalAlerts,
      TimelineId.casePage,
    ];

    test('it disables view selection when timelineId is undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <TopN {...testProps} timelineId={undefined} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="view-select"]').first().props().disabled).toBe(true);
    });

    test('it disables view selection when timelineId is `active`', () => {
      const wrapper = mount(
        <TestProviders>
          <TopN {...testProps} timelineId={TimelineId.active} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="view-select"]').first().props().disabled).toBe(true);
    });

    detectionAlertsTimelines.forEach((timelineId) => {
      test(`it enables view selection for detection alert table '${timelineId}'`, () => {
        const wrapper = mount(
          <TestProviders>
            <TopN {...testProps} timelineId={timelineId} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="view-select"]').first().props().disabled).toBe(false);
      });
    });

    nonDetectionAlertTables.forEach((timelineId) => {
      test(`it disables view selection for NON detection alert table '${timelineId}'`, () => {
        const wrapper = mount(
          <TestProviders>
            <TopN {...testProps} timelineId={timelineId} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="view-select"]').first().props().disabled).toBe(true);
      });
    });
  });

  describe('events view', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
    });

    test(`it renders EventsByDataset when defaultView is 'raw'`, () => {
      expect(
        wrapper.find('[data-test-subj="eventsByDatasetOverview-uuid.v4()Panel"]').exists()
      ).toBe(true);
    });

    test(`it does NOT render SignalsByCategory when defaultView is 'raw'`, () => {
      expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBe(false);
    });
  });

  describe('alerts view', () => {
    beforeAll(() => {
      testProps = {
        ...testProps,
        defaultView: eventTypes.alert,
      };
    });

    test(`it renders SignalsByCategory when defaultView is 'alert'`, async () => {
      const wrapper = mount(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBe(true);
      });
    });

    test(`it does NOT render EventsByDataset when defaultView is 'alert'`, async () => {
      const wrapper = mount(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="eventsByDatasetOverview-uuid.v4()Panel"]').exists()
        ).toBe(false);
      });
    });
  });

  describe('All events, a view shown only when rendered in the context of the active timeline', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      testProps = {
        ...testProps,
        defaultView: eventTypes.all,
        options: allEvents,
      };
      wrapper = mount(
        <TestProviders>
          <TopN {...testProps} combinedQueries={JSON.stringify(combinedQueries)} />
        </TestProviders>
      );
    });

    test(`it renders EventsByDataset when defaultView is 'all'`, () => {
      expect(
        wrapper.find('[data-test-subj="eventsByDatasetOverview-uuid.v4()Panel"]').exists()
      ).toBe(true);
    });

    test(`it does NOT render SignalsByCategory when defaultView is 'all'`, () => {
      expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBe(false);
    });
  });
});
