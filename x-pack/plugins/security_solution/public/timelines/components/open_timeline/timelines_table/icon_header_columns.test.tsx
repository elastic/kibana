/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, omit } from 'lodash/fp';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import '../../../../common/mock/match_media';
import { mockTimelineResults } from '../../../../common/mock/timeline_results';
import { TimelinesTable, TimelinesTableProps } from '.';
import { OpenTimelineResult } from '../types';
import { getMockTimelinesTableProps } from './mocks';
import { getMockTheme } from '../../../../common/lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });

jest.mock('../../../../common/lib/kibana');

describe('#getActionsColumns', () => {
  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the pinned events header icon', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="pinned-event-header-icon"]').exists()).toBe(true);
  });

  test('it renders the expected pinned events count', () => {
    const with6Events = [mockResults[0]];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(with6Events),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="pinned-event-count"]').text()).toEqual('6');
  });

  test('it renders the notes count header icon', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="notes-count-header-icon"]').exists()).toBe(true);
  });

  test('it renders the expected notes count', () => {
    const with4Notes = [mockResults[0]];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(with4Notes),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="notes-count"]').text()).toEqual('4');
  });

  test('it renders the favorites header icon', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="favorites-header-icon"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is undefined', () => {
    const undefinedFavorite: OpenTimelineResult[] = [omit('favorite', { ...mockResults[0] })];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(undefinedFavorite),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="favorite-starEmpty-star"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is null', () => {
    const nullFavorite: OpenTimelineResult[] = [{ ...mockResults[0], favorite: null }];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(nullFavorite),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="favorite-starEmpty-star"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is empty', () => {
    const emptyFavorite: OpenTimelineResult[] = [{ ...mockResults[0], favorite: [] }];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(emptyFavorite),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="favorite-starEmpty-star"]').exists()).toBe(true);
  });

  test('it renders an filled star when favorite has one entry', () => {
    const favorite: OpenTimelineResult[] = [
      {
        ...mockResults[0],
        favorite: [
          {
            userName: 'alice',
            favoriteDate: 1553700753 * 10000,
          },
        ],
      },
    ];

    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(favorite),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="favorite-starFilled-star"]').exists()).toBe(true);
  });

  test('it renders an filled star when favorite has more than one entry', () => {
    const favorite: OpenTimelineResult[] = [
      {
        ...mockResults[0],
        favorite: [
          {
            userName: 'alice',
            favoriteDate: 1553700753 * 10000,
          },
          {
            userName: 'bob',
            favoriteDate: 1653700754 * 10000,
          },
        ],
      },
    ];

    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(favorite),
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="favorite-starFilled-star"]').exists()).toBe(true);
  });
});
