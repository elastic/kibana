/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { DataView } from '@kbn/data-views-plugin/common';
import { nextTick } from '@kbn/test-jest-helpers';

import { KibanaLogic } from '../../../shared/kibana/kibana_logic';

import {
  AnalyticsCollectionExploreTableLogic,
  Sorting,
} from './analytics_collection_explore_table_logic';
import { ExploreTableColumns, ExploreTables } from './analytics_collection_explore_table_types';
import { AnalyticsCollectionToolbarLogic } from './analytics_collection_toolbar/analytics_collection_toolbar_logic';

jest.mock('../../../shared/kibana/kibana_logic', () => ({
  KibanaLogic: {
    values: {
      data: {
        search: {
          search: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
        },
      },
    },
  },
}));

describe('AnalyticsCollectionExplorerTablesLogic', () => {
  const { mount } = new LogicMounter(AnalyticsCollectionExploreTableLogic);

  beforeEach(() => {
    jest.clearAllMocks();

    mount();
  });

  const defaultProps = {
    dataView: null,
    isLoading: false,
    items: [],
    pageIndex: 0,
    pageSize: 10,
    search: '',
    selectedTable: null,
    sorting: null,
    timeRange: {
      from: 'now-7d',
      to: 'now',
    },
    totalItemsCount: 0,
  };

  it('initializes with default values', () => {
    expect(AnalyticsCollectionExploreTableLogic.values).toEqual(defaultProps);
  });

  describe('reducers', () => {
    it('should handle set items', () => {
      const items = [
        { count: 1, query: 'test' },
        { count: 2, query: 'test2' },
      ];
      AnalyticsCollectionExploreTableLogic.actions.setItems(items);
      expect(AnalyticsCollectionExploreTableLogic.values.items).toEqual(items);
    });

    it('should handle set selectedTable', () => {
      const id = ExploreTables.WorsePerformers;
      const sorting = { direction: 'desc', field: ExploreTableColumns.count } as Sorting;
      AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(id, sorting);
      expect(AnalyticsCollectionExploreTableLogic.values.selectedTable).toEqual(id);
      expect(AnalyticsCollectionExploreTableLogic.values.sorting).toEqual(sorting);
    });

    it('should handle set sorting', () => {
      const sorting = { direction: 'asc', field: ExploreTableColumns.sessions } as Sorting;
      AnalyticsCollectionExploreTableLogic.actions.onTableChange({
        sort: sorting,
      });
      expect(AnalyticsCollectionExploreTableLogic.values.sorting).toEqual(sorting);
    });

    describe('isLoading', () => {
      beforeEach(() => {
        mount({ selectedTable: ExploreTables.Referrers });
        AnalyticsCollectionExploreTableLogic.actions.setDataView({ id: 'test' } as DataView);
      });

      it('should handle onTableChange', () => {
        AnalyticsCollectionExploreTableLogic.actions.onTableChange({
          page: { index: 2, size: 10 },
          sort: {
            direction: 'asc',
            field: ExploreTableColumns.sessions,
          } as Sorting,
        });
        expect(AnalyticsCollectionExploreTableLogic.values.isLoading).toEqual(true);
      });

      it('should handle setSearch', () => {
        AnalyticsCollectionExploreTableLogic.actions.setSearch('test');
        expect(AnalyticsCollectionExploreTableLogic.values.isLoading).toEqual(true);
      });

      it('should handle setItems', () => {
        AnalyticsCollectionExploreTableLogic.actions.setItems([]);
        expect(AnalyticsCollectionExploreTableLogic.values.isLoading).toEqual(false);
      });

      it('should handle setSelectedTable', () => {
        AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.Referrers);
        expect(AnalyticsCollectionExploreTableLogic.values.isLoading).toEqual(true);
      });

      it('should handle setTimeRange', () => {
        AnalyticsCollectionToolbarLogic.actions.setTimeRange({ from: 'now-7d', to: 'now' });
        expect(AnalyticsCollectionExploreTableLogic.values.isLoading).toEqual(true);
      });

      it('should handle setSearchSessionId', () => {
        AnalyticsCollectionToolbarLogic.actions.setSearchSessionId('12345');
        expect(AnalyticsCollectionExploreTableLogic.values.isLoading).toEqual(true);
      });
    });

    describe('pageIndex', () => {
      it('should handle setPageIndex', () => {
        AnalyticsCollectionExploreTableLogic.actions.onTableChange({
          page: { index: 2, size: 10 },
        });
        expect(AnalyticsCollectionExploreTableLogic.values.pageIndex).toEqual(2);
      });

      it('should handle setSelectedTable', () => {
        AnalyticsCollectionExploreTableLogic.actions.onTableChange({
          page: { index: 2, size: 10 },
        });
        AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.Referrers);
        expect(AnalyticsCollectionExploreTableLogic.values.pageIndex).toEqual(0);
      });

      it('should handle reset', () => {
        AnalyticsCollectionExploreTableLogic.actions.onTableChange({
          page: { index: 2, size: 10 },
        });
        AnalyticsCollectionExploreTableLogic.actions.reset();
        expect(AnalyticsCollectionExploreTableLogic.values.pageIndex).toEqual(0);
      });

      it('should handle setSearch', () => {
        AnalyticsCollectionExploreTableLogic.actions.onTableChange({
          page: { index: 2, size: 10 },
        });
        AnalyticsCollectionExploreTableLogic.actions.setSearch('');
        expect(AnalyticsCollectionExploreTableLogic.values.pageIndex).toEqual(0);
      });
    });

    describe('pageSize', () => {
      it('should handle setPageSize', () => {
        AnalyticsCollectionExploreTableLogic.actions.onTableChange({
          page: { index: 2, size: 10 },
        });
        expect(AnalyticsCollectionExploreTableLogic.values.pageSize).toEqual(10);
      });

      it('should handle setSelectedTable', () => {
        AnalyticsCollectionExploreTableLogic.actions.onTableChange({
          page: { index: 2, size: 10 },
        });
        AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.Referrers);
        expect(AnalyticsCollectionExploreTableLogic.values.pageSize).toEqual(10);
      });

      it('should handle reset', () => {
        AnalyticsCollectionExploreTableLogic.actions.onTableChange({
          page: { index: 2, size: 10 },
        });
        AnalyticsCollectionExploreTableLogic.actions.reset();
        expect(AnalyticsCollectionExploreTableLogic.values.pageSize).toEqual(10);
      });
    });

    describe('search', () => {
      it('should handle setSearch', () => {
        AnalyticsCollectionExploreTableLogic.actions.setSearch('test');
        expect(AnalyticsCollectionExploreTableLogic.values.search).toEqual('test');
      });

      it('should handle setSelectedTable', () => {
        AnalyticsCollectionExploreTableLogic.actions.setSearch('test');
        AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.Referrers);
        expect(AnalyticsCollectionExploreTableLogic.values.search).toEqual('');
      });

      it('should handle reset', () => {
        AnalyticsCollectionExploreTableLogic.actions.setSearch('test');
        AnalyticsCollectionExploreTableLogic.actions.reset();
        expect(AnalyticsCollectionExploreTableLogic.values.search).toEqual('');
      });
    });

    it('should handle totalItemsCount', () => {
      AnalyticsCollectionExploreTableLogic.actions.setTotalItemsCount(100);
      expect(AnalyticsCollectionExploreTableLogic.values.totalItemsCount).toEqual(100);
    });
  });

  describe('listeners', () => {
    const mockDataView = { id: 'test' } as DataView;
    beforeEach(() => {
      mount({ selectedTable: ExploreTables.Referrers });
      AnalyticsCollectionExploreTableLogic.actions.setDataView(mockDataView);
    });

    it('should fetch items when selectedTable changes', () => {
      AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.Referrers);
      expect(KibanaLogic.values.data.search.search).toHaveBeenCalledWith(expect.any(Object), {
        indexPattern: mockDataView,
        sessionId: undefined,
      });
    });

    it('should fetch items when timeRange changes', () => {
      AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.WorsePerformers);
      (KibanaLogic.values.data.search.search as jest.Mock).mockClear();

      AnalyticsCollectionToolbarLogic.actions.setTimeRange({ from: 'now-7d', to: 'now' });
      expect(KibanaLogic.values.data.search.search).toHaveBeenCalledWith(expect.any(Object), {
        indexPattern: mockDataView,
        sessionId: undefined,
      });
    });

    it('should fetch items when searchSessionId changes', () => {
      AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.WorsePerformers);
      (KibanaLogic.values.data.search.search as jest.Mock).mockClear();

      AnalyticsCollectionToolbarLogic.actions.setSearchSessionId('1234');
      expect(KibanaLogic.values.data.search.search).toHaveBeenCalledWith(expect.any(Object), {
        indexPattern: mockDataView,
        sessionId: '1234',
      });
    });

    it('should fetch items when onTableChange called', () => {
      AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.WorsePerformers);
      (KibanaLogic.values.data.search.search as jest.Mock).mockClear();

      AnalyticsCollectionExploreTableLogic.actions.onTableChange({});
      expect(KibanaLogic.values.data.search.search).toHaveBeenCalledWith(expect.any(Object), {
        indexPattern: mockDataView,
        sessionId: undefined,
      });
    });

    it('should fetch items when search changes', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      AnalyticsCollectionExploreTableLogic.actions.setSelectedTable(ExploreTables.WorsePerformers);
      (KibanaLogic.values.data.search.search as jest.Mock).mockClear();

      AnalyticsCollectionExploreTableLogic.actions.setSearch('test');
      jest.advanceTimersByTime(200);
      await nextTick();

      expect(KibanaLogic.values.data.search.search).toHaveBeenCalledWith(expect.any(Object), {
        indexPattern: mockDataView,
        sessionId: undefined,
      });
    });
  });
});
