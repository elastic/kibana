/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { UseCursorProps, useCursor } from './use_cursor';

describe('useCursor', () => {
  it('returns undefined cursor if no values have been set', () => {
    const { result } = renderHook((props: UseCursorProps) => useCursor(props), {
      initialProps: { pageIndex: 0, pageSize: 0 },
    });

    expect(result.current[0]).toBeUndefined();
  });

  it('retrieves a cursor for the next page of a given page size', () => {
    const { rerender, result } = renderHook((props: UseCursorProps) => useCursor(props), {
      initialProps: { pageIndex: 0, pageSize: 0 },
    });
    rerender({ pageIndex: 1, pageSize: 1 });
    act(() => {
      result.current[1]('new_cursor');
    });

    expect(result.current[0]).toBeUndefined();

    rerender({ pageIndex: 2, pageSize: 1 });
    expect(result.current[0]).toEqual('new_cursor');
  });

  it('returns undefined cursor for an unknown search', () => {
    const { rerender, result } = renderHook((props: UseCursorProps) => useCursor(props), {
      initialProps: { pageIndex: 0, pageSize: 0 },
    });
    act(() => {
      result.current[1]('new_cursor');
    });

    rerender({ pageIndex: 1, pageSize: 2 });
    expect(result.current[0]).toBeUndefined();
  });

  it('remembers cursor through rerenders', () => {
    const { rerender, result } = renderHook((props: UseCursorProps) => useCursor(props), {
      initialProps: { pageIndex: 0, pageSize: 0 },
    });

    rerender({ pageIndex: 1, pageSize: 1 });
    act(() => {
      result.current[1]('new_cursor');
    });

    rerender({ pageIndex: 2, pageSize: 1 });
    expect(result.current[0]).toEqual('new_cursor');

    rerender({ pageIndex: 0, pageSize: 0 });
    expect(result.current[0]).toBeUndefined();

    rerender({ pageIndex: 2, pageSize: 1 });
    expect(result.current[0]).toEqual('new_cursor');
  });

  it('remembers multiple cursors', () => {
    const { rerender, result } = renderHook((props: UseCursorProps) => useCursor(props), {
      initialProps: { pageIndex: 0, pageSize: 0 },
    });

    rerender({ pageIndex: 1, pageSize: 1 });
    act(() => {
      result.current[1]('new_cursor');
    });
    rerender({ pageIndex: 2, pageSize: 2 });
    act(() => {
      result.current[1]('another_cursor');
    });

    rerender({ pageIndex: 2, pageSize: 1 });
    expect(result.current[0]).toEqual('new_cursor');

    rerender({ pageIndex: 3, pageSize: 2 });
    expect(result.current[0]).toEqual('another_cursor');
  });

  it('returns the "nearest" cursor for the given page size', () => {
    const { rerender, result } = renderHook((props: UseCursorProps) => useCursor(props), {
      initialProps: { pageIndex: 0, pageSize: 0 },
    });

    rerender({ pageIndex: 1, pageSize: 2 });
    act(() => {
      result.current[1]('cursor1');
    });
    rerender({ pageIndex: 2, pageSize: 2 });
    act(() => {
      result.current[1]('cursor2');
    });
    rerender({ pageIndex: 3, pageSize: 2 });
    act(() => {
      result.current[1]('cursor3');
    });

    rerender({ pageIndex: 2, pageSize: 2 });
    expect(result.current[0]).toEqual('cursor1');

    rerender({ pageIndex: 3, pageSize: 2 });
    expect(result.current[0]).toEqual('cursor2');

    rerender({ pageIndex: 4, pageSize: 2 });
    expect(result.current[0]).toEqual('cursor3');

    rerender({ pageIndex: 6, pageSize: 2 });
    expect(result.current[0]).toEqual('cursor3');
  });
});
