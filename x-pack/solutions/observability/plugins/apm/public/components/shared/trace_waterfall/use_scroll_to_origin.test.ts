/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { List } from 'react-virtualized';
import { useScrollToOrigin } from './use_scroll_to_origin';
import type { TraceWaterfallItem } from './use_trace_waterfall';

const makeItem = (id: string): TraceWaterfallItem => ({
  id,
  parentId: undefined,
  name: id,
  timestampUs: 0,
  traceId: 'trace-1',
  duration: 100,
  serviceName: 'svc',
  depth: 0,
  offset: 0,
  skew: 0,
  color: 'red',
  errors: [],
  spanLinksCount: { incoming: 0, outgoing: 0 },
  docType: 'span',
});

const itemA = makeItem('a');
const itemB = makeItem('b');
const itemC = makeItem('c');
const visibleList = [itemA, itemB, itemC];

const makeListRef = (scrollToRow = jest.fn()) =>
  ({ current: { scrollToRow } } as unknown as React.MutableRefObject<List>);

const makeScrollToOriginRef = () => ({ current: () => {} } as React.MutableRefObject<() => void>);

describe('useScrollToOrigin', () => {
  describe('onScrolled', () => {
    it('calls setIsContextSpanVisible(true) when context span index is within the rendered range', () => {
      const setIsContextSpanVisible = jest.fn();
      const { result } = renderHook(() =>
        useScrollToOrigin({
          contextSpanId: 'b',
          visibleList,
          listRef: makeListRef(),
          scrollToOriginRef: makeScrollToOriginRef(),
          setIsContextSpanVisible,
        })
      );

      result.current.onScrolled({ startIndex: 0, stopIndex: 2 });

      expect(setIsContextSpanVisible).toHaveBeenCalledWith(true);
    });

    it('calls setIsContextSpanVisible(false) when context span index is outside the rendered range', () => {
      const setIsContextSpanVisible = jest.fn();
      const { result } = renderHook(() =>
        useScrollToOrigin({
          contextSpanId: 'c',
          visibleList,
          listRef: makeListRef(),
          scrollToOriginRef: makeScrollToOriginRef(),
          setIsContextSpanVisible,
        })
      );

      // item 'c' is at index 2, rendered range is 0–1
      result.current.onScrolled({ startIndex: 0, stopIndex: 1 });

      expect(setIsContextSpanVisible).toHaveBeenCalledWith(false);
    });

    it('does not call setIsContextSpanVisible when contextSpanId is not set', () => {
      const setIsContextSpanVisible = jest.fn();
      const { result } = renderHook(() =>
        useScrollToOrigin({
          contextSpanId: undefined,
          visibleList,
          listRef: makeListRef(),
          scrollToOriginRef: makeScrollToOriginRef(),
          setIsContextSpanVisible,
        })
      );

      result.current.onScrolled({ startIndex: 0, stopIndex: 2 });

      expect(setIsContextSpanVisible).not.toHaveBeenCalled();
    });

    it('does not call setIsContextSpanVisible when context span is not in the visible list', () => {
      const setIsContextSpanVisible = jest.fn();
      const { result } = renderHook(() =>
        useScrollToOrigin({
          contextSpanId: 'nonexistent',
          visibleList,
          listRef: makeListRef(),
          scrollToOriginRef: makeScrollToOriginRef(),
          setIsContextSpanVisible,
        })
      );

      result.current.onScrolled({ startIndex: 0, stopIndex: 2 });

      expect(setIsContextSpanVisible).not.toHaveBeenCalled();
    });
  });

  describe('scrollToOriginRef', () => {
    it('calls listRef.current.scrollToRow with the correct index', () => {
      const scrollToRow = jest.fn();
      const scrollToOriginRef = makeScrollToOriginRef();

      renderHook(() =>
        useScrollToOrigin({
          contextSpanId: 'b',
          visibleList,
          listRef: makeListRef(scrollToRow),
          scrollToOriginRef,
          setIsContextSpanVisible: jest.fn(),
        })
      );

      scrollToOriginRef.current();

      // 'b' is at index 1
      expect(scrollToRow).toHaveBeenCalledWith(1);
    });

    it('does not call scrollToRow when context span is not in the visible list', () => {
      const scrollToRow = jest.fn();
      const scrollToOriginRef = makeScrollToOriginRef();

      renderHook(() =>
        useScrollToOrigin({
          contextSpanId: 'nonexistent',
          visibleList,
          listRef: makeListRef(scrollToRow),
          scrollToOriginRef,
          setIsContextSpanVisible: jest.fn(),
        })
      );

      scrollToOriginRef.current();

      expect(scrollToRow).not.toHaveBeenCalled();
    });

    it('updates scrollToOriginRef.current when visibleList changes', () => {
      const scrollToRow = jest.fn();
      const scrollToOriginRef = makeScrollToOriginRef();
      const extendedList = [makeItem('x'), itemA, itemB, itemC];

      const { rerender } = renderHook(
        ({ list }: { list: TraceWaterfallItem[] }) =>
          useScrollToOrigin({
            contextSpanId: 'b',
            visibleList: list,
            listRef: makeListRef(scrollToRow),
            scrollToOriginRef,
            setIsContextSpanVisible: jest.fn(),
          }),
        { initialProps: { list: visibleList } }
      );

      // 'b' starts at index 1
      scrollToOriginRef.current();
      expect(scrollToRow).toHaveBeenLastCalledWith(1);

      // after prepending 'x', 'b' moves to index 2
      rerender({ list: extendedList });
      scrollToOriginRef.current();
      expect(scrollToRow).toHaveBeenLastCalledWith(2);
    });
  });
});
