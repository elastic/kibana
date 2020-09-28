/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import { TestProviders, mockIndexPattern } from '../../mock';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';

import { allEvents, defaultOptions } from './helpers';
import { TopN } from './top_n';
import { TimelineEventsType } from '../../../../common/types/timeline';
import { InputsModelId } from '../../store/inputs/constants';

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

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

const field = 'process.name';
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

  const query = { query: '', language: 'kuery' };

  const toggleTopN = jest.fn();
  const eventTypes: { [id: string]: TimelineEventsType } = {
    raw: 'raw',
    alert: 'alert',
    all: 'all',
  };
  let testProps = {
    defaultView: eventTypes.raw,
    field,
    filters: [],
    from: '2020-04-14T00:31:47.695Z',
    indexNames: [],
    indexPattern: mockIndexPattern,
    options: defaultOptions,
    query,
    setAbsoluteRangeDatePicker,
    setAbsoluteRangeDatePickerTarget: 'global' as InputsModelId,
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

    test('it enables the view select by default', () => {
      expect(wrapper.find('[data-test-subj="view-select"]').first().props().disabled).toBe(false);
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
    let wrapper: ReactWrapper;

    beforeEach(() => {
      testProps = {
        ...testProps,
        defaultView: eventTypes.alert,
      };
      wrapper = mount(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
    });

    test(`it renders SignalsByCategory when defaultView is 'alert'`, () => {
      expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBe(true);
    });

    test(`it does NOT render EventsByDataset when defaultView is 'alert'`, () => {
      expect(
        wrapper.find('[data-test-subj="eventsByDatasetOverview-uuid.v4()Panel"]').exists()
      ).toBe(false);
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

    test(`it disables the view select when 'options' contains only one entry`, () => {
      expect(wrapper.find('[data-test-subj="view-select"]').first().props().disabled).toBe(true);
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
