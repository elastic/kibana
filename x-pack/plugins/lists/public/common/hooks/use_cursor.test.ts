/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { UseCursorArgs, useCursor } from './use_cursor';

describe('useCursor', () => {
  it('returns undefined cursor if no values have been set', () => {
    const { result } = renderHook((args: UseCursorArgs) => useCursor(args));

    expect(result.current[0]).toBeUndefined();
  });

  it('retrieves a cursor for a known set of args', () => {
    const { rerender, result } = renderHook((args: UseCursorArgs) => useCursor(args));
    act(() => {
      result.current[1]('new_cursor', { pageIndex: 1, pageSize: 1 });
    });
    rerender({ pageIndex: 1, pageSize: 1 });

    expect(result.current[0]).toEqual('new_cursor');
  });

  it('returns undefined cursor for an unknown set of args', () => {
    const { rerender, result } = renderHook((args: UseCursorArgs) => useCursor(args));
    act(() => {
      result.current[1]('new_cursor', { pageIndex: 1, pageSize: 1 });
    });
    rerender({ pageIndex: 1, pageSize: 100 });

    expect(result.current[0]).toBeUndefined();
  });

  it('remembers multiple cursors', () => {
    const { rerender, result } = renderHook((args: UseCursorArgs) => useCursor(args));

    act(() => {
      result.current[1]('new_cursor', { pageIndex: 1, pageSize: 1 });
    });
    rerender({ pageIndex: 1, pageSize: 1 });
    expect(result.current[0]).toEqual('new_cursor');

    act(() => {
      result.current[1]('another_cursor', { pageIndex: 2, pageSize: 2 });
    });
    rerender({ pageIndex: 2, pageSize: 2 });
    expect(result.current[0]).toEqual('another_cursor');
  });
});
