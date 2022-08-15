/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { sessionViewIOEventsMock } from '../../../common/mocks/responses/session_view_io_events.mock';
import { useIOLines, useXtermPlayer, XtermPlayerDeps } from './hooks';
import { ProcessEventsPage } from '../../../common/types/process_tree';

describe('TTYPlayer/hooks', () => {
  beforeAll(() => {
    // https://stackoverflow.com/questions/39830580/jest-test-fails-typeerror-window-matchmedia-is-not-a-function
    // xtermjs is using window.matchMedia, which isn't mocked in jest by default.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe('useIOLines', () => {
    it('returns an array of "best effort" lines of tty output', async () => {
      const events = sessionViewIOEventsMock?.events?.map((event) => event._source);
      const initial: ProcessEventsPage[] = [{ events, total: events?.length }];

      const { result, rerender } = renderHook(({ pages }) => useIOLines(pages), {
        initialProps: { pages: initial },
      });

      expect(result.current.length).toBeGreaterThan(0);
      expect(typeof result.current[0].value).toBe('string');

      // test memoization
      let last = result.current;
      rerender();
      expect(result.current === last).toBeTruthy();
      last = result.current;
      rerender({ pages: [...initial] });
      expect(result.current === last).toBeFalsy();
    });
  });

  describe('useXtermPlayer', () => {
    let initialProps: XtermPlayerDeps;

    beforeEach(() => {
      const events = sessionViewIOEventsMock?.events?.map((event) => event._source);
      const pages: ProcessEventsPage[] = [{ events, total: events?.length }];
      const { result } = renderHook(() => useIOLines(pages));
      const lines = result.current;
      const div = document.createElement('div');
      const mockRef = { current: div };
      initialProps = {
        ref: mockRef,
        isPlaying: false,
        lines,
        hasNextPage: false,
        fetchNextPage: () => null,
        isFullscreen: false,
      };
    });

    it('mounts and renders the first line of output', async () => {
      const { result: xTermResult } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      const { terminal, currentLine, seekToLine } = xTermResult.current;

      // there is a minor delay in updates to xtermjs after writeln is called.
      await new Promise((r) => setTimeout(r, 100));

      // check that first line rendered in xtermjs
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('256');
      expect(currentLine).toBe(0);

      act(() => {
        seekToLine(17); // line where vim output starts
      });

      await new Promise((r) => setTimeout(r, 100));

      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('#!/bin/env bash');
    });

    it('allows the user to seek to any line of output', async () => {
      const { result: xTermResult } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      act(() => {
        xTermResult.current.seekToLine(17); // line where vim output starts
      });

      await new Promise((r) => setTimeout(r, 100));

      const { terminal, currentLine } = xTermResult.current;

      expect(currentLine).toBe(17);
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('#!/bin/env bash');
    });

    it('will allow a plain text search highlight on the last line printed', async () => {
      const { result: xTermResult } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      await new Promise((r) => setTimeout(r, 100));

      act(() => {
        xTermResult.current.search('256', 0);
      });

      const { terminal } = xTermResult.current;

      expect(terminal.getSelection()).toBe('256');
    });
  });
});
