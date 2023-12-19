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

const mockUserProfiles = [
  {
    uid: 'user-id-1',
    enabled: true,
    user: { username: 'user1', full_name: 'User 1', email: 'user1@test.com' },
    data: {},
  },
  {
    uid: 'user-id-2',
    enabled: true,
    user: { username: 'user2', full_name: 'User 2', email: 'user2@test.com' },
    data: {},
  },
  {
    uid: 'user-id-3',
    enabled: true,
    user: { username: 'user3', full_name: 'User 3', email: 'user3@test.com' },
    data: {},
  },
];
jest.mock('../../../common/components/user_profiles/use_suggest_users', () => {
  return {
    useSuggestUsers: () => ({
      loading: false,
      userProfiles: mockUserProfiles,
    }),
  };
});

const basicKibanaServicesMock = createStartServicesMock();

const getFieldByNameMock = jest.fn(() => true);

const mockedDataViewServiceGetter = jest.fn(() => {
  return Promise.resolve({
    getFieldByName: getFieldByNameMock,
  } as unknown as DataView);
});

const mockDataViewCreator = jest.fn();

const getKibanaServiceWithMockedGetter = (
  mockedDataViewGetter: DataViewsServicePublic['get'] = mockedDataViewServiceGetter
) => {
  return {
    ...basicKibanaServicesMock,
    dataViews: {
      ...basicKibanaServicesMock.dataViews,
      clearInstanceCache: jest.fn(),
      get: mockedDataViewGetter,
      create: mockDataViewCreator,
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

  it('should create dataview on render', async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(mockDataViewCreator).toHaveBeenCalledTimes(1);
      expect(mockDataViewCreator).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'security_solution_alerts_dv',
          name: 'Security Solution Alerts DataView',
          allowNoIndex: true,
          title: '.siem-signals-spacename',
        })
      );
    });
  });

  it('should clear cache on unmount', async () => {
    const { unmount } = render(<TestComponent />);

    await waitFor(() => {
      // wait for the document to completely load.
      unmount();
    });

    await waitFor(() => {
      expect(kibanaServiceDefaultMock.dataViews.clearInstanceCache).toHaveBeenCalledTimes(1);
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
