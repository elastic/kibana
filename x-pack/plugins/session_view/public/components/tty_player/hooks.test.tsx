/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { sessionViewIOEventsMock } from '../../../common/mocks/responses/session_view_io_events.mock';
import { useIOLines } from './hooks';
import { ProcessEventsPage } from '../../../common/types/process_tree';

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
 // TODO:
});
