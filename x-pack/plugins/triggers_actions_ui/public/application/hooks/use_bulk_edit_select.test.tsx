/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useBulkEditSelect } from './use_bulk_edit_select';
import { RuleTableItem } from '../../types';

const items = [
  {
    id: '1',
    isEditable: true,
  },
  {
    id: '2',
    isEditable: true,
  },
  {
    id: '3',
    isEditable: true,
  },
  {
    id: '4',
    isEditable: true,
  },
] as RuleTableItem[];

describe('useBulkEditSelectTest', () => {
  it('getFilter should return null when nothing is selected', async () => {
    const { result } = renderHook(() =>
      useBulkEditSelect({
        items,
        totalItemCount: 4,
      })
    );

    expect(result.current.getFilter()).toEqual(null);
  });

  it('getFilter should return rule list filter when nothing is selected', async () => {
    const { result } = renderHook(() =>
      useBulkEditSelect({
        items,
        totalItemCount: 4,
        tagsFilter: ['test: 123'],
        searchText: 'rules*',
      })
    );

    expect(result.current.getFilter()?.arguments.length).toEqual(2);
  });

  it('getFilter should return rule list filter when something is selected', async () => {
    const { result } = renderHook(() =>
      useBulkEditSelect({
        items,
        totalItemCount: 4,
        tagsFilter: ['test: 123'],
        searchText: 'rules*',
      })
    );

    act(() => {
      result.current.onSelectRow(items[0]);
    });

    expect(result.current.getFilter()?.arguments.length).toEqual(2);
    expect([...result.current.selectedIds]).toEqual([items[0].id]);
  });

  it('getFilter should return null when selecting all', async () => {
    const { result } = renderHook(() =>
      useBulkEditSelect({
        items,
        totalItemCount: 4,
      })
    );

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.getFilter()).toEqual(null);
  });

  it('getFilter should return rule list filter when selecting all with excluded ids', async () => {
    const { result } = renderHook(() =>
      useBulkEditSelect({
        items,
        totalItemCount: 4,
      })
    );

    act(() => {
      result.current.onSelectAll();
      result.current.onSelectRow(items[0]);
    });

    expect(result.current.getFilter()?.arguments.length).toEqual(1);
  });

  it('getFilter should return rule list filter when selecting all', async () => {
    const { result } = renderHook(() =>
      useBulkEditSelect({
        items,
        totalItemCount: 4,
        tagsFilter: ['test: 123'],
        searchText: 'rules*',
      })
    );

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.getFilter()?.arguments.length).toEqual(2);
  });

  it('getFilter should return rule list filter and exclude ids when selecting all with excluded ids', async () => {
    const { result } = renderHook(() =>
      useBulkEditSelect({
        items,
        totalItemCount: 4,
        tagsFilter: ['test: 123'],
        searchText: 'rules*',
      })
    );

    act(() => {
      result.current.onSelectAll();
      result.current.onSelectRow(items[0]);
    });

    expect(result.current.getFilter()?.arguments.length).toEqual(2);
    expect(result.current.getFilter()?.arguments[1].arguments[0].arguments).toEqual([
      expect.objectContaining({
        value: 'alert.id',
      }),
      expect.objectContaining({
        value: 'alert:1',
      }),
    ]);
  });
});
