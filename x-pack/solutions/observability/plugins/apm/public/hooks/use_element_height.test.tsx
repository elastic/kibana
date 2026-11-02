/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type React from 'react';
import { useRef } from 'react';
import { useElementHeight } from './use_element_height';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  // Helper to trigger resize events
  triggerResize(entries: ResizeObserverEntry[]) {
    act(() => {
      this.callback(entries, this);
    });
  }
}

describe('useElementHeight', () => {
  let mockResizeObserver: MockResizeObserver;
  let originalResizeObserver: typeof global.ResizeObserver;

  beforeEach(() => {
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = jest.fn((callback: ResizeObserverCallback) => {
      mockResizeObserver = new MockResizeObserver(callback);
      return mockResizeObserver as unknown as ResizeObserver;
    }) as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    jest.clearAllMocks();
  });

  it('returns 0 initially when ref is null', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      return useElementHeight(ref);
    });

    expect(result.current).toBe(0);
  });

  it('returns 0 initially when enabled is false', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      return useElementHeight(ref, false);
    });

    expect(result.current).toBe(0);
    // When enabled is false, ResizeObserver is never created, so mockResizeObserver may be undefined
    if (mockResizeObserver) {
      expect(mockResizeObserver.observe).not.toHaveBeenCalled();
    }
  });

  it('measures height correctly when element is observed', () => {
    const mockElement = document.createElement('div');
    const mockBoundingRect = { height: 100, width: 200 } as DOMRect;
    jest.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue(mockBoundingRect);

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      return useElementHeight(ref);
    });

    // Initially should be 0
    expect(result.current).toBe(0);

    // Trigger resize event
    const mockEntry = {
      target: mockElement,
      contentRect: { height: 100, width: 200 } as DOMRectReadOnly,
      contentBoxSize: [],
      borderBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry;

    mockResizeObserver.triggerResize([mockEntry]);

    expect(result.current).toBe(100);
    expect(mockResizeObserver.observe).toHaveBeenCalledWith(mockElement);
  });

  it('updates height when element size changes via ResizeObserver', () => {
    const mockElement = document.createElement('div');
    let currentHeight = 100;
    jest.spyOn(mockElement, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          height: currentHeight,
          width: 200,
        } as DOMRect)
    );

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      return useElementHeight(ref);
    });

    // Initial resize
    const mockEntry1 = {
      target: mockElement,
      contentRect: { height: 100, width: 200 } as DOMRectReadOnly,
      contentBoxSize: [],
      borderBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry;

    mockResizeObserver.triggerResize([mockEntry1]);
    expect(result.current).toBe(100);

    // Update height
    currentHeight = 200;
    const mockEntry2 = {
      target: mockElement,
      contentRect: { height: 200, width: 200 } as DOMRectReadOnly,
      contentBoxSize: [],
      borderBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry;

    mockResizeObserver.triggerResize([mockEntry2]);
    expect(result.current).toBe(200);
  });

  it('respects enabled parameter (does not observe when false)', () => {
    const mockElement = document.createElement('div');
    const { result, rerender } = renderHook(
      ({ enabled }) => {
        const ref = useRef<HTMLDivElement>(mockElement);
        return useElementHeight(ref, enabled);
      },
      { initialProps: { enabled: false } }
    );

    expect(result.current).toBe(0);
    // When enabled is false, ResizeObserver is never created
    if (mockResizeObserver) {
      expect(mockResizeObserver.observe).not.toHaveBeenCalled();
    }

    // Enable the hook
    rerender({ enabled: true });
    expect(mockResizeObserver.observe).toHaveBeenCalledWith(mockElement);

    // Disable again - the cleanup function calls disconnect(), not unobserve()
    rerender({ enabled: false });
    expect(mockResizeObserver.disconnect).toHaveBeenCalled();
  });

  it('cleans up ResizeObserver on unmount', () => {
    const mockElement = document.createElement('div');
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      return useElementHeight(ref);
    });

    expect(mockResizeObserver.observe).toHaveBeenCalled();

    unmount();

    expect(mockResizeObserver.disconnect).toHaveBeenCalled();
  });

  it('handles multiple resize events correctly', () => {
    const mockElement = document.createElement('div');
    let height = 50;
    jest.spyOn(mockElement, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          height,
          width: 200,
        } as DOMRect)
    );

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      return useElementHeight(ref);
    });

    // First resize
    height = 50;
    const mockEntry1 = {
      target: mockElement,
      contentRect: { height: 50, width: 200 } as DOMRectReadOnly,
      contentBoxSize: [],
      borderBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry;

    mockResizeObserver.triggerResize([mockEntry1]);
    expect(result.current).toBe(50);

    // Second resize
    height = 75;
    const mockEntry2 = {
      target: mockElement,
      contentRect: { height: 75, width: 200 } as DOMRectReadOnly,
      contentBoxSize: [],
      borderBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry;

    mockResizeObserver.triggerResize([mockEntry2]);
    expect(result.current).toBe(75);

    // Third resize
    height = 100;
    const mockEntry3 = {
      target: mockElement,
      contentRect: { height: 100, width: 200 } as DOMRectReadOnly,
      contentBoxSize: [],
      borderBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry;

    mockResizeObserver.triggerResize([mockEntry3]);
    expect(result.current).toBe(100);
  });

  it('does not observe when ref.current is null even if enabled is true', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      return useElementHeight(ref, true);
    });

    expect(result.current).toBe(0);
    expect(mockResizeObserver.observe).not.toHaveBeenCalled();
  });

  it('updates when ref changes from null to element', () => {
    const mockElement = document.createElement('div');
    jest.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      height: 150,
      width: 200,
    } as DOMRect);

    const initialRef = { current: null } as React.RefObject<HTMLDivElement>;
    const { result, rerender } = renderHook(
      ({ ref }) => {
        return useElementHeight(ref);
      },
      {
        initialProps: { ref: initialRef },
      }
    );

    expect(result.current).toBe(0);
    // When ref.current is null, ResizeObserver is never created
    if (mockResizeObserver) {
      expect(mockResizeObserver.observe).not.toHaveBeenCalled();
    }

    // Update ref to have an element
    const newRef = { current: mockElement } as React.RefObject<HTMLDivElement>;
    rerender({ ref: newRef });

    const mockEntry = {
      target: mockElement,
      contentRect: { height: 150, width: 200 } as DOMRectReadOnly,
      contentBoxSize: [],
      borderBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry;

    mockResizeObserver.triggerResize([mockEntry]);
    expect(result.current).toBe(150);
    expect(mockResizeObserver.observe).toHaveBeenCalledWith(mockElement);
  });
});
