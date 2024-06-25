/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '../../../../utils/test_helper';
import { useFetchSloGroups } from '../../../../hooks/use_fetch_slo_groups';
import { useFetchSloList } from '../../../../hooks/use_fetch_slo_list';
import { DEFAULT_SLO_GROUPS_PAGE_SIZE } from '../../../../../common/constants';

import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { GroupView } from './group_view';

jest.mock('../../../../hooks/use_fetch_slo_groups');
jest.mock('../../hooks/use_url_search_state');
jest.mock('../../../../hooks/use_fetch_slo_list');

const useFetchSloGroupsMock = useFetchSloGroups as jest.Mock;
const useUrlSearchStateMock = useUrlSearchState as jest.Mock;
const useFetchSloListMock = useFetchSloList as jest.Mock;

describe('Group View', () => {
  beforeEach(() => {
    useUrlSearchStateMock.mockImplementation(() => ({
      state: {
        page: 0,
        perPage: DEFAULT_SLO_GROUPS_PAGE_SIZE,
      },
    }));

    useFetchSloListMock.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: {
        page: 0,
        perPage: 10,
        total: 0,
      },
    });
  });

  it('should show error', async () => {
    useFetchSloGroupsMock.mockReturnValue({
      isError: true,
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
    });
    const { queryByTestId, getByTestId } = render(
      <GroupView groupBy="slo.tags" kqlQuery="" sloView="cardView" sort="status" direction="desc" />
    );

    expect(queryByTestId('sloGroupView')).toBeNull();
    expect(getByTestId('sloGroupListError')).toBeInTheDocument();
  });

  it('should show no results', async () => {
    useFetchSloGroupsMock.mockReturnValue({
      isError: false,
      isLoading: false,
      data: {
        page: 0,
        perPage: 10,
        total: 0,
        results: [],
      },
      refetch: jest.fn(),
    });

    const { queryByTestId, getByTestId } = render(
      <GroupView groupBy="slo.tags" kqlQuery="" sloView="cardView" sort="status" direction="desc" />
    );

    expect(queryByTestId('sloGroupView')).toBeNull();
    expect(getByTestId('sloGroupListEmpty')).toBeInTheDocument();
  });

  it('should show loading indicator', async () => {
    useFetchSloGroupsMock.mockReturnValue({
      isLoading: true,
      refetch: jest.fn(),
    });

    const { queryByTestId, getByTestId } = render(
      <GroupView groupBy="slo.tags" kqlQuery="" sloView="cardView" sort="status" direction="desc" />
    );
    expect(queryByTestId('sloGroupView')).toBeNull();
    expect(getByTestId('sloGroupListLoading')).toBeInTheDocument();
  });

  describe('group by tags', () => {
    it('should render slo groups grouped by tags', async () => {
      useFetchSloGroupsMock.mockReturnValue({
        isLoading: false,
        isError: false,
        isSuccess: true,
        data: {
          page: 0,
          perPage: 10,
          total: 3,
          results: [
            {
              group: 'production',
              groupBy: 'slo.tags',
              summary: {
                total: 3,
                worst: {
                  sliValue: 1,
                  status: 'healthy',
                  slo: {
                    id: 'irrelevant',
                    instanceId: 'irrelevant',
                    name: 'irrelevant',
                    groupings: {},
                  },
                },
                healthy: 2,
                violated: 1,
                degrading: 0,
                noData: 0,
              },
            },
            {
              group: 'something',
              groupBy: 'slo.tags',
              summary: {
                total: 1,
                worst: {
                  sliValue: 1,
                  status: 'healthy',
                  slo: {
                    id: 'irrelevant',
                    instanceId: 'irrelevant',
                    name: 'irrelevant',
                    groupings: {},
                  },
                },
                healthy: 0,
                violated: 1,
                degrading: 0,
                noData: 0,
              },
            },
            {
              group: 'anything',
              groupBy: 'slo.tags',
              summary: {
                total: 2,
                worst: {
                  sliValue: 1,
                  status: 'healthy',
                  slo: {
                    id: 'irrelevant',
                    instanceId: 'irrelevant',
                    name: 'irrelevant',
                    groupings: {},
                  },
                },
                healthy: 1,
                violated: 0,
                degrading: 0,
                noData: 1,
              },
            },
          ],
        },
        refetch: jest.fn(),
      });
      const { queryAllByTestId, getByTestId } = render(
        <GroupView
          groupBy="slo.tags"
          kqlQuery=""
          sloView="cardView"
          sort="status"
          direction="desc"
        />
      );
      expect(getByTestId('sloGroupView')).toBeInTheDocument();
      expect(useFetchSloGroups).toHaveBeenCalled();
      expect(useFetchSloGroups).toHaveBeenCalledWith({
        groupBy: 'slo.tags',
        kqlQuery: '',
        page: 1,
        perPage: DEFAULT_SLO_GROUPS_PAGE_SIZE,
      });
      expect(queryAllByTestId('sloGroupViewPanel').length).toEqual(3);
    });

    it('should render slo groups filtered by selected tags', async () => {
      useUrlSearchStateMock.mockImplementation(() => ({
        state: {
          tags: {
            included: ['production'],
            excluded: [],
          },
          page: 0,
          perPage: DEFAULT_SLO_GROUPS_PAGE_SIZE,
        },
      }));
      useFetchSloGroupsMock.mockReturnValue({
        isLoading: false,
        isError: false,
        isSuccess: true,
        data: {
          page: 0,
          perPage: 10,
          total: 1,
          results: [
            {
              group: 'production',
              groupBy: 'slo.tags',
              summary: { total: 3, worst: 0.95, healthy: 2, violated: 1, degrading: 0, noData: 0 },
            },
          ],
        },
        refetch: jest.fn(),
      });

      const { queryAllByTestId } = render(
        <GroupView
          groupBy="slo.tags"
          kqlQuery=""
          sloView="cardView"
          sort="status"
          direction="desc"
        />
      );
      expect(useFetchSloGroups).toHaveBeenCalled();
      expect(useFetchSloGroups).toHaveBeenCalledWith({
        groupBy: 'slo.tags',
        kqlQuery: '',
        page: 1,
        perPage: DEFAULT_SLO_GROUPS_PAGE_SIZE,
      });
      expect(queryAllByTestId('sloGroupViewPanel').length).toEqual(1);
    });
  });

  describe('group by status', () => {
    it('should render slo groups grouped by status', async () => {
      const { getByTestId } = render(
        <GroupView groupBy="status" kqlQuery="" sloView="cardView" sort="status" direction="desc" />
      );
      expect(getByTestId('sloGroupView')).toBeInTheDocument();
      expect(useFetchSloGroups).toHaveBeenCalled();
      expect(useFetchSloGroups).toHaveBeenCalledWith({
        groupBy: 'status',
        kqlQuery: '',
        page: 1,
        perPage: DEFAULT_SLO_GROUPS_PAGE_SIZE,
      });
    });
  });

  describe('group by SLI indicator type', () => {
    it('should render slo groups grouped by indicator type', async () => {
      const { getByTestId } = render(
        <GroupView
          groupBy="slo.indicator.type"
          kqlQuery=""
          sloView="cardView"
          sort="status"
          direction="desc"
        />
      );
      expect(getByTestId('sloGroupView')).toBeInTheDocument();
      expect(useFetchSloGroups).toHaveBeenCalled();
      expect(useFetchSloGroups).toHaveBeenCalledWith({
        groupBy: 'slo.indicator.type',
        kqlQuery: '',
        page: 1,
        perPage: DEFAULT_SLO_GROUPS_PAGE_SIZE,
      });
    });
  });
});
