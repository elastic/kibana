/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ENTRY_LEADER_ENTITY_ID, CONTAINER_IMAGE_NAME } from '../../../common/constants';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { GlobalFilter } from '../../types';
import { ContainerNameWidget, LOADING_TEST_ID } from '.';
import { useFetchContainerNameData } from './hooks';
import { ContainerNameRow } from './container_name_row';
import { fireEvent } from '@testing-library/react';

const TABLE_ID = 'containerNameSessionTable';
const TABLE_CONTAINER_NAME_ID = 'containerImageNameSessionNameColumn';
const TABLE_CONTAINER_COUNT_ID = 'containerImageNameSessionCountColumn';
const TABLE_ROW_ELEMENT = 'containerNameSessionRow';
const TABLE_SORT_BUTTON_ID = 'tableHeaderSortButton';

const TITLE = 'Container Images Session';
const GLOBAL_FILTER: GlobalFilter = {
  endDate: '2022-06-15T14:15:25.777Z',
  filterQuery: '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}',
  startDate: '2022-05-15T14:15:25.777Z',
};
const MOCK_DATA = {
  pages: [
    {
      buckets: [
        { key: 'Container A', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container B', doc_count: 295, count_by_aggs: { value: 3 } },
        { key: 'Container C', doc_count: 295, count_by_aggs: { value: 2 } },
        { key: 'Container D', doc_count: 295, count_by_aggs: { value: 4 } },
        { key: 'Container E', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container F', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container G', doc_count: 295, count_by_aggs: { value: 0 } },
        { key: 'Container H', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container J', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container K', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container L', doc_count: 295, count_by_aggs: { value: 5 } },
      ],
      hasNextPage: true,
    },
    {
      buckets: [
        { key: 'Container A2', doc_count: 295, count_by_aggs: { value: 2 } },
        { key: 'Container B2', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container C2', doc_count: 295, count_by_aggs: { value: 6 } },
        { key: 'Container D2', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container E2', doc_count: 295, count_by_aggs: { value: 3 } },
        { key: 'Container F2', doc_count: 295, count_by_aggs: { value: 1 } },
      ],
      hasNextPage: false,
    },
  ],
  pageParams: [undefined],
};

jest.mock('../../hooks/use_filter', () => ({
  useSetFilter: () => ({
    getFilterForValueButton: jest.fn(),
    getFilterOutValueButton: jest.fn(),
    filterManager: {},
  }),
}));

jest.mock('./hooks');
const mockUseFetchData = useFetchContainerNameData as jest.Mock;

describe('ContainerNameWidget component', () => {
  let renderResult: ReturnType<typeof render>;
  const mockedContext = createAppRootMockRenderer();
  const render: () => ReturnType<AppContextTestRender['render']> = () =>
    (renderResult = mockedContext.render(
      <ContainerNameWidget
        widgetKey="containerNameSessions"
        globalFilter={GLOBAL_FILTER}
        groupedBy={CONTAINER_IMAGE_NAME}
        countBy={ENTRY_LEADER_ENTITY_ID}
      />
    ));

  describe('When ContainerNameWidget is mounted', () => {
    describe('with data', () => {
      beforeEach(() => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA,
          isFetchingNextPage: true,
        }));
      });

      it('should show title, table with correct columns', async () => {
        render();
        expect(renderResult.queryByTestId(TABLE_ID)).toBeVisible();
        expect(renderResult.queryAllByTestId(TABLE_SORT_BUTTON_ID)).toHaveLength(1);
        expect(renderResult.queryAllByTestId(TABLE_CONTAINER_NAME_ID)).toHaveLength(17);
        expect(renderResult.queryAllByTestId(TABLE_CONTAINER_COUNT_ID)).toHaveLength(17);
      });

      it('should show data value names and value', async () => {
        render();
        expect(renderResult.queryAllByTestId(TABLE_CONTAINER_NAME_ID)).toHaveLength(17);
        expect(renderResult.queryAllByTestId(TABLE_CONTAINER_COUNT_ID)).toHaveLength(17);
        expect(renderResult.queryAllByTestId(TABLE_ROW_ELEMENT)).toHaveLength(17);
      });
    });

    describe('without data ', () => {
      it('should show no items found text', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: undefined,
          isFetchingNextPage: false,
        }));
        render();
        expect(renderResult.getByText(TITLE)).toBeVisible();
        expect(renderResult.getByText('No items found')).toBeVisible();
        expect(renderResult.getByTestId(TABLE_ID)).toBeVisible();
      });
    });

    describe('when loading data', () => {
      it('should show progress bar', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA,
          isFetchingNextPage: false,
          isLoading: true,
        }));
        render();
        expect(renderResult.getByTestId(LOADING_TEST_ID)).toBeVisible();
      });
    });
  });
});

const TEST_NAME = 'TEST ROW';
const TEST_BUTTON_FILTER = <div>Filter In</div>;
const TEST_BUTTON_FILTER_OUT = <div>Filter Out</div>;

describe('ContainerNameRow component with valid row', () => {
  let renderResult: ReturnType<typeof render>;
  const mockedContext = createAppRootMockRenderer();
  const render: () => ReturnType<AppContextTestRender['render']> = () =>
    (renderResult = mockedContext.render(
      <ContainerNameRow
        name={TEST_NAME}
        index={1}
        filterButtonIn={TEST_BUTTON_FILTER}
        filterButtonOut={TEST_BUTTON_FILTER_OUT}
      />
    ));

  it('should show the row element as well as the pop up filter button when mouse hovers above it', async () => {
    render();
    expect(renderResult.getByText(TEST_NAME)).toBeVisible();
    fireEvent.mouseOver(renderResult.queryByText(TEST_NAME)!);
    expect(renderResult.getByText('Filter In')).toBeVisible();
    expect(renderResult.getByText('Filter Out')).toBeVisible();
  });

  it('should show the row element but not the pop up filter button outside mouse hover', async () => {
    render();
    expect(renderResult.getByText(TEST_NAME)).toBeVisible();
    expect(renderResult.queryByText('Filter In')).toBeFalsy();
    expect(renderResult.queryByText('Filter Out')).toBeFalsy();
  });
});
