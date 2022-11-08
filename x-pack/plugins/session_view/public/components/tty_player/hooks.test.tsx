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
import { DEFAULT_TTY_FONT_SIZE, DEFAULT_TTY_PLAYSPEED_MS } from '../../../common/constants';

const VIM_LINE_START = 22;

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

    jest.useFakeTimers('legacy');
  });

  describe('useIOLines', () => {
    it('returns an array of "best effort" lines of tty output', async () => {
      const events = sessionViewIOEventsMock?.events?.map((event) => event._source);
      const initial: ProcessEventsPage[] = [{ events, total: events?.length }];

      const { result, rerender } = renderHook(({ pages }) => useIOLines(pages), {
        initialProps: { pages: initial },
      });

      expect(result.current.lines.length).toBeGreaterThan(0);
      expect(typeof result.current.lines[0].value).toBe('string');

      // test memoization
      let last = result.current.lines;
      rerender();
      expect(result.current.lines === last).toBeTruthy();
      last = result.current.lines;
      rerender({ pages: [...initial] });
      expect(result.current.lines === last).toBeFalsy();
    });
  });

  describe('useXtermPlayer', () => {
    let initialProps: XtermPlayerDeps;

    beforeEach(() => {
      const events = sessionViewIOEventsMock?.events?.map((event) => event._source);
      const pages: ProcessEventsPage[] = [{ events, total: events?.length }];
      const { result } = renderHook(() => useIOLines(pages));
      const lines = result.current.lines;
      const div = document.createElement('div');
      const mockRef = { current: div };
      initialProps = {
        ref: mockRef,
        isPlaying: false,
        setIsPlaying: jest.fn(),
        lines,
        hasNextPage: false,
        fetchNextPage: () => null,
        isFetching: false,
        fontSize: DEFAULT_TTY_FONT_SIZE,
      };
    });

    it('mounts and renders the first line of output', async () => {
      const { result: xTermResult } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      const { terminal, currentLine, seekToLine } = xTermResult.current;

      // there is a minor delay in updates to xtermjs after writeln is called.
      jest.advanceTimersByTime(100);

      // check that first line rendered in xtermjs
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('256');
      expect(currentLine).toBe(0);

      act(() => {
        seekToLine(VIM_LINE_START); // line where vim output starts
      });

      jest.advanceTimersByTime(100);

      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('#!/bin/env bash');
    });

    it('allows the user to seek to any line of output', async () => {
      const { result: xTermResult } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      act(() => {
        xTermResult.current.seekToLine(VIM_LINE_START); // line where vim output starts
      });

      jest.advanceTimersByTime(100);

      const { terminal, currentLine } = xTermResult.current;

      expect(currentLine).toBe(VIM_LINE_START);
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('#!/bin/env bash');
    });

    it('allows the user to play', async () => {
      const { result, rerender } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      rerender({ ...initialProps, isPlaying: true });

      act(() => {
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * 10);
      });

      expect(result.current.currentLine).toBe(10);
    });

    it('allows the user to stop', async () => {
      const { result, rerender } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      rerender({ ...initialProps, isPlaying: true });
      act(() => {
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * 10);
      });
      rerender({ ...initialProps, isPlaying: false });
      act(() => {
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * 10);
      });
      expect(result.current.currentLine).toBe(10); // should not have advanced
    });

    it('should stop when it reaches the end of the array of lines', async () => {
      const { result, rerender } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      rerender({ ...initialProps, isPlaying: true });
      act(() => {
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * initialProps.lines.length + 100);
      });
      expect(result.current.currentLine).toBe(initialProps.lines.length - 1);
    });

    it('should not print the first line twice after playback starts', async () => {
      const { result, rerender } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      rerender({ ...initialProps, isPlaying: true });
      act(() => {
        // advance render loop
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS);
      });
      rerender({ ...initialProps, isPlaying: false });

      expect(result.current.terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('256');
    });

    it('ensure the first few render loops have printed the right lines', async () => {
      const { result, rerender } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      const LOOPS = 6;

      rerender({ ...initialProps, isPlaying: true });

      act(() => {
        // advance render loop
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * LOOPS);
      });

      rerender({ ...initialProps, isPlaying: false });

      expect(result.current.terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('256');
      expect(result.current.terminal.buffer.active.getLine(1)?.translateToString(true)).toBe(',');
      expect(result.current.terminal.buffer.active.getLine(2)?.translateToString(true)).toBe(
        '                             Some Companies Puppet instance'
      );
      expect(result.current.terminal.buffer.active.getLine(3)?.translateToString(true)).toBe(
        '             |  |    |       CentOS Stream release 8 on x86_64'
      );
      expect(result.current.terminal.buffer.active.getLine(4)?.translateToString(true)).toBe(
        '  ***********************    Load average: 1.23, 1.01, 0.63'
      );
      expect(result.current.terminal.buffer.active.getLine(5)?.translateToString(true)).toBe(
        '  ************************   '
      );
      expect(result.current.currentLine).toBe(LOOPS);
    });

    it('will allow a plain text search highlight on the last line printed', async () => {
      const { result: xTermResult } = renderHook((props) => useXtermPlayer(props), {
        initialProps,
      });

      jest.advanceTimersByTime(100);

      act(() => {
        xTermResult.current.search('256', 0);
      });

      const { terminal } = xTermResult.current;

      expect(terminal.getSelection()).toBe('256');
    });
  });
});
