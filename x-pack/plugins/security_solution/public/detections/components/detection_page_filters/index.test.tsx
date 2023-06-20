/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { DetectionPageFilterSet } from '.';
import { TEST_IDS } from '../../../common/components/filter_group/constants';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../common/lib/kibana';
import { FilterGroup } from '../../../common/components/filter_group';
import { getMockedFilterGroupWithCustomFilters } from '../../../common/components/filter_group/mocks';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';

jest.mock('../../../common/components/filter_group');

jest.mock('../../../common/lib/kibana');

const basicKibanaServicesMock = createStartServicesMock();

const getFieldByNameMock = jest.fn(() => true);

const mockedDataViewServiceGetter = jest.fn(() => {
  return Promise.resolve({
    getFieldByName: getFieldByNameMock,
  } as unknown as DataView);
});

const getKibanaServiceWithMockedGetter = (
  mockedDataViewGetter: DataViewsServicePublic['get'] = mockedDataViewServiceGetter
) => {
  return {
    ...basicKibanaServicesMock,
    dataViews: {
      ...basicKibanaServicesMock.dataViews,
      clearInstanceCache: jest.fn(),
      get: mockedDataViewGetter,
    },
  };
};

const kibanaServiceDefaultMock = getKibanaServiceWithMockedGetter();

const onFilterChangeMock = jest.fn();

const TestComponent = (props: Partial<ComponentProps<typeof DetectionPageFilterSet>> = {}) => {
  return (
    <TestProviders>
      <DetectionPageFilterSet
        chainingSystem="HIERARCHICAL"
        dataViewId=""
        onFilterChange={onFilterChangeMock}
        {...props}
      />
    </TestProviders>
  );
};

describe('Detection Page Filters', () => {
  beforeAll(() => {
    (FilterGroup as jest.Mock).mockImplementation(getMockedFilterGroupWithCustomFilters());
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...kibanaServiceDefaultMock,
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should renders correctly', async () => {
    render(<TestComponent />);
    expect(screen.getByTestId(TEST_IDS.FILTER_LOADING)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId(TEST_IDS.MOCKED_CONTROL)).toBeInTheDocument();
    });
  });

  it('should check all the fields till any absent field is found', async () => {
    render(<TestComponent />);
    expect(screen.getByTestId(TEST_IDS.FILTER_LOADING)).toBeInTheDocument();
    await waitFor(() => {
      expect(getFieldByNameMock).toHaveBeenCalledTimes(4);
      expect(kibanaServiceDefaultMock.dataViews.clearInstanceCache).toHaveBeenCalledTimes(0);
    });
  });

  it('should stop checking fields if blank field is found and clear the cache', async () => {
    const getFieldByNameLocalMock = jest.fn(() => false);
    const mockGetter = jest.fn(() =>
      Promise.resolve({ getFieldByName: getFieldByNameLocalMock } as unknown as DataView)
    );
    const modifiedKibanaServicesMock = getKibanaServiceWithMockedGetter(mockGetter);
    (useKibana as jest.Mock).mockReturnValueOnce({ services: modifiedKibanaServicesMock });

    render(<TestComponent />);
    expect(screen.getByTestId(TEST_IDS.FILTER_LOADING)).toBeInTheDocument();
    await waitFor(() => {
      expect(getFieldByNameLocalMock).toHaveBeenCalledTimes(1);
      expect(modifiedKibanaServicesMock.dataViews.clearInstanceCache).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId(TEST_IDS.MOCKED_CONTROL)).toBeInTheDocument();
    });
  });

  it('should call onFilterChange', async () => {
    const filtersToTest = [
      {
        meta: {
          index: 'security-solution-default',
          key: 'kibana.alert.severity',
        },
        query: {
          match_phrase: {
            'kibana.alert.severity': 'low',
          },
        },
      },
    ];
    (FilterGroup as jest.Mock).mockImplementationOnce(
      getMockedFilterGroupWithCustomFilters(filtersToTest)
    );
    render(<TestComponent />);

    await waitFor(() => {
      expect(onFilterChangeMock).toHaveBeenNthCalledWith(1, [
        {
          ...filtersToTest[0],
          meta: {
            ...filtersToTest[0].meta,
            disabled: false,
          },
        },
      ]);
    });
  });
});
