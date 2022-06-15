/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ENTRY_LEADER_INTERACTIVE } from '../../../common/constants';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { GlobalFilter } from '../../types';
import { PercentWidget, LOADING_TEST_ID, PERCENT_DATA_TEST_ID } from '.';
import { useFetchPercentWidgetData } from './hooks';

const MOCK_DATA: Record<string, number> = {
  false: 47,
  true: 1,
};
const TITLE = 'Percent Widget Title';
const GLOBAL_FILTER: GlobalFilter = {
  endDate: '2022-06-15T14:15:25.777Z',
  filterQuery: '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}',
  startDate: '2022-05-15T14:15:25.777Z',
};
const DATA_VALUE_MAP = {
  true: {
    name: 'Interactive',
    fieldName: ENTRY_LEADER_INTERACTIVE,
    color: 'red',
  },
  false: {
    name: 'Non-interactive',
    fieldName: ENTRY_LEADER_INTERACTIVE,
    color: 'blue',
  },
};

jest.mock('../../hooks/use_filter', () => ({
  useSetFilter: () => ({
    getFilterForValueButton: jest.fn(),
    getFilterOutValueButton: jest.fn(),
    filterManager: {},
  }),
}));

jest.mock('./hooks');
const mockUseFetchData = useFetchPercentWidgetData as jest.Mock;

describe('PercentWidget component', () => {
  let renderResult: ReturnType<typeof render>;
  const mockedContext = createAppRootMockRenderer();
  const render: () => ReturnType<AppContextTestRender['render']> = () =>
    (renderResult = mockedContext.render(
      <PercentWidget
        title={TITLE}
        dataValueMap={DATA_VALUE_MAP}
        widgetKey="percentWidget"
        globalFilter={GLOBAL_FILTER}
        groupedBy={ENTRY_LEADER_INTERACTIVE}
        onReduce={jest.fn()}
      />
    ));

  describe('When PercentWidget is mounted', () => {
    describe('with data', () => {
      beforeEach(() => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA,
          isLoading: false,
        }));
      });

      it('should show title', async () => {
        render();

        expect(renderResult.getByText(TITLE)).toBeVisible();
      });
      it('should show data value names and value', async () => {
        render();

        expect(renderResult.getByText('Interactive')).toBeVisible();
        expect(renderResult.getByText('Non-interactive')).toBeVisible();
        expect(renderResult.queryByTestId(LOADING_TEST_ID)).toBeNull();
        expect(renderResult.getByText(47)).toBeVisible();
        expect(renderResult.getByText(1)).toBeVisible();
      });
      it('should show same number of data items as the number of records provided in dataValueMap', async () => {
        render();

        expect(renderResult.getAllByTestId(PERCENT_DATA_TEST_ID)).toHaveLength(2);
      });
    });

    describe('without data ', () => {
      it('should show data value names and zeros as values when loading', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: undefined,
          isLoading: true,
        }));
        render();

        expect(renderResult.getByText('Interactive')).toBeVisible();
        expect(renderResult.getByText('Non-interactive')).toBeVisible();
        expect(renderResult.getByTestId(LOADING_TEST_ID)).toBeVisible();
        expect(renderResult.getAllByText(0)).toHaveLength(2);
      });
      it('should show zeros as values if no data returned', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: undefined,
          isLoading: false,
        }));
        render();

        expect(renderResult.getByText('Interactive')).toBeVisible();
        expect(renderResult.getByText('Non-interactive')).toBeVisible();
        expect(renderResult.getAllByText(0)).toHaveLength(2);
      });
    });
  });
});
