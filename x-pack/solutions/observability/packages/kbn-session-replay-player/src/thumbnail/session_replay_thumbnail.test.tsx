/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { clickEvent, fullSnapshotEvent, metaEvent, T0 } from '../test_helpers/replay_events';
import { extractThumbnailSnapshot } from './extract_thumbnail_snapshot';
import { rebuildThumbnail } from './rebuild_thumbnail';
import { SessionReplayThumbnail } from './session_replay_thumbnail';

jest.mock('./rebuild_thumbnail');

const rebuild = jest.mocked(rebuildThumbnail);

const snapshot = extractThumbnailSnapshot([
  metaEvent(T0),
  fullSnapshotEvent(T0 + 1),
  clickEvent(T0 + 2),
]);
if (!snapshot) {
  throw new Error('fixture has no snapshot');
}

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let intersect: (isIntersecting: boolean) => void;
let observerCount: number;

beforeEach(() => {
  observerCount = 0;
  class FakeIntersectionObserver {
    constructor(callback: ObserverCallback) {
      observerCount++;
      intersect = (isIntersecting) => callback([{ isIntersecting }]);
    }

    observe() {}

    disconnect() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: FakeIntersectionObserver,
  });
  rebuild.mockReset();
});

afterEach(() => {
  Reflect.deleteProperty(window, 'IntersectionObserver');
});

describe('SessionReplayThumbnail', () => {
  it('shows a placeholder and draws nothing before it is on screen', () => {
    render(<SessionReplayThumbnail snapshot={snapshot} />);

    expect(screen.getByTestId('sessionReplayThumbnailPlaceholder')).toBeInTheDocument();
    expect(rebuild).not.toHaveBeenCalled();
  });

  it('draws the snapshot once it scrolls into view', async () => {
    const destroy = jest.fn();
    rebuild.mockResolvedValue({ destroy });
    render(<SessionReplayThumbnail snapshot={snapshot} allowedRemoteOrigins={['https://cdn.x']} />);

    act(() => intersect(true));

    await waitFor(() =>
      expect(screen.getByTestId('sessionReplayThumbnail')).toHaveAttribute('data-state', 'drawn')
    );
    expect(rebuild).toHaveBeenCalledTimes(1);
    expect(rebuild).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot, allowedRemoteOrigins: ['https://cdn.x'] })
    );
    expect(screen.queryByTestId('sessionReplayThumbnailPlaceholder')).not.toBeInTheDocument();
  });

  it('observes the element once and draws once', async () => {
    rebuild.mockResolvedValue({ destroy: jest.fn() });
    render(<SessionReplayThumbnail snapshot={snapshot} />);

    act(() => intersect(true));
    await waitFor(() => expect(rebuild).toHaveBeenCalledTimes(1));
    expect(observerCount).toBe(1);
  });

  it('removes the drawing on unmount', async () => {
    const destroy = jest.fn();
    rebuild.mockResolvedValue({ destroy });
    const { unmount } = render(<SessionReplayThumbnail snapshot={snapshot} />);
    act(() => intersect(true));
    await waitFor(() => expect(rebuild).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('sessionReplayThumbnail')).toHaveAttribute('data-state', 'drawn')
    );

    unmount();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('discards a drawing that finishes after unmount', async () => {
    const destroy = jest.fn();
    let finish: (value: { destroy: () => void }) => void = () => {};
    rebuild.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { unmount } = render(<SessionReplayThumbnail snapshot={snapshot} />);
    act(() => intersect(true));
    await waitFor(() => expect(rebuild).toHaveBeenCalled());

    unmount();
    await act(async () => finish({ destroy }));

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps the placeholder when drawing fails', async () => {
    rebuild.mockRejectedValue(new Error('boom'));
    render(<SessionReplayThumbnail snapshot={snapshot} />);

    act(() => intersect(true));
    await waitFor(() => expect(rebuild).toHaveBeenCalled());

    expect(screen.getByTestId('sessionReplayThumbnailPlaceholder')).toBeInTheDocument();
  });

  it('keeps the placeholder when there is no snapshot', async () => {
    render(<SessionReplayThumbnail />);

    act(() => intersect(true));

    expect(rebuild).not.toHaveBeenCalled();
    expect(screen.getByTestId('sessionReplayThumbnailPlaceholder')).toBeInTheDocument();
  });

  it('has an accessible name', () => {
    render(<SessionReplayThumbnail snapshot={snapshot} aria-label="Checkout page" />);

    expect(screen.getByRole('img', { name: 'Checkout page' })).toBeInTheDocument();
  });

  it('draws straight away where IntersectionObserver is missing', async () => {
    Reflect.deleteProperty(window, 'IntersectionObserver');
    rebuild.mockResolvedValue({ destroy: jest.fn() });

    render(<SessionReplayThumbnail snapshot={snapshot} />);

    await waitFor(() => expect(rebuild).toHaveBeenCalledTimes(1));
  });
});
