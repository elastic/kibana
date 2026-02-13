/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from './use_reduced_motion';

describe('useReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let mockAddEventListener: jest.Mock;
  let mockRemoveEventListener: jest.Mock;
  let mediaQueryChangeHandler: ((event: MediaQueryListEvent) => void) | null = null;

  const createMockMatchMedia = (matches: boolean) => {
    mockAddEventListener = jest.fn((_, handler) => {
      mediaQueryChangeHandler = handler;
    });
    mockRemoveEventListener = jest.fn();

    return jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  };

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    mediaQueryChangeHandler = null;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('initial state detection', () => {
    it('returns false when prefers-reduced-motion is not set', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.prefersReducedMotion).toBe(false);
    });

    it('returns true when prefers-reduced-motion is set to reduce', () => {
      window.matchMedia = createMockMatchMedia(true);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('queries the correct media query', () => {
      const mockMatchMedia = createMockMatchMedia(false);
      window.matchMedia = mockMatchMedia;

      renderHook(() => useReducedMotion());

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });
  });

  describe('media query change handling', () => {
    it('updates state when preference changes to reduced motion', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current.prefersReducedMotion).toBe(false);

      act(() => {
        if (mediaQueryChangeHandler) {
          mediaQueryChangeHandler({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('updates state when preference changes to normal motion', () => {
      window.matchMedia = createMockMatchMedia(true);

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current.prefersReducedMotion).toBe(true);

      act(() => {
        if (mediaQueryChangeHandler) {
          mediaQueryChangeHandler({ matches: false } as MediaQueryListEvent);
        }
      });

      expect(result.current.prefersReducedMotion).toBe(false);
    });

    it('adds event listener on mount', () => {
      window.matchMedia = createMockMatchMedia(false);

      renderHook(() => useReducedMotion());

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('removes event listener on unmount', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { unmount } = renderHook(() => useReducedMotion());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('getAnimationDuration', () => {
    it('returns the original duration when reduced motion is not preferred', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.getAnimationDuration(200)).toBe(200);
      expect(result.current.getAnimationDuration(500)).toBe(500);
      expect(result.current.getAnimationDuration(1000)).toBe(1000);
    });

    it('returns 0 when reduced motion is preferred', () => {
      window.matchMedia = createMockMatchMedia(true);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.getAnimationDuration(200)).toBe(0);
      expect(result.current.getAnimationDuration(500)).toBe(0);
      expect(result.current.getAnimationDuration(1000)).toBe(0);
    });

    it('updates return value when preference changes', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current.getAnimationDuration(200)).toBe(200);

      act(() => {
        if (mediaQueryChangeHandler) {
          mediaQueryChangeHandler({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current.getAnimationDuration(200)).toBe(0);
    });
  });
});
