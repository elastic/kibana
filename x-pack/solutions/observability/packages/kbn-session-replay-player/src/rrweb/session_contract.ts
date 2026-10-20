/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayEvent } from '../types';
import type { ReplayerSession, ReplayerSessionCallbacks, ReplayerSessionFactory } from './types';

export interface ContractFixture {
  /** At least a viewport event, a full snapshot and one more event. */
  events: readonly ReplayEvent[];
  /** An event after the last of `events`. */
  laterEvent: ReplayEvent;
  viewport: { width: number; height: number };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Behaviours every implementation of the adapter must show, so the fake used by the component
 * tests cannot drift from the real rrweb wrapper.
 */
export const describeReplayerSessionContract = (
  label: string,
  getFactory: () => ReplayerSessionFactory,
  fixture: ContractFixture
): void => {
  describe(`replayer session contract: ${label}`, () => {
    let root: HTMLElement;
    let callbacks: ReplayerSessionCallbacks & {
      viewports: Array<{ width: number; height: number }>;
    };
    let session: ReplayerSession | undefined;

    const create = (events: readonly ReplayEvent[] = fixture.events): ReplayerSession => {
      session = getFactory()({ root, initialEvents: events, speed: 1, callbacks });
      return session;
    };

    beforeEach(() => {
      root = document.createElement('div');
      document.body.appendChild(root);
      const viewports: Array<{ width: number; height: number }> = [];
      callbacks = {
        viewports,
        onFinish: jest.fn(),
        onViewportChange: (size) => {
          viewports.push(size);
        },
      };
    });

    afterEach(() => {
      session?.destroy();
      session = undefined;
      root.remove();
    });

    it('refuses fewer than two events', () => {
      expect(() => create(fixture.events.slice(0, 1))).toThrow();
    });

    it('renders into the given element and exposes the element it positions the page in', () => {
      const created = create();

      expect(root.contains(created.getWrapper() ?? null)).toBe(true);
    });

    it('reports the recorded viewport', () => {
      create();

      expect(callbacks.viewports[0]).toEqual(fixture.viewport);
    });

    it('shows the frame at an offset when paused there', () => {
      const created = create();

      created.pause(0);

      expect(created.getCurrentOffsetMs()).toBe(0);
    });

    it('knows the duration of the events it was given', () => {
      const created = create();
      const last = fixture.events[fixture.events.length - 1].timestamp;

      expect(created.getDurationMs()).toBe(last - fixture.events[0].timestamp);
    });

    it('extends its duration after later events are appended, once they have been applied', async () => {
      const created = create();
      created.pause(0);

      created.append([fixture.laterEvent]);
      await tick();

      expect(created.getDurationMs()).toBe(
        fixture.laterEvent.timestamp - fixture.events[0].timestamp
      );
    });

    it('accepts a speed change', () => {
      const created = create();

      expect(() => created.setSpeed(4)).not.toThrow();
    });

    it('can be destroyed twice, ignores calls afterwards and releases its element', () => {
      const created = create();

      created.destroy();

      expect(() => {
        created.destroy();
        created.play(0);
        created.pause(0);
        created.append([fixture.laterEvent]);
        created.setSpeed(2);
      }).not.toThrow();
      expect(created.getWrapper()).toBeUndefined();
    });
  });
};
