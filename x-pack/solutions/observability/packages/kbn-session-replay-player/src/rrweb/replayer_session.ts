/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventType, IncrementalSource, ReplayerEvents } from '@rrweb/types';
import type { canvasEventWithTime } from '@rrweb/types';
import { isMetaEvent, isReplayEvent } from '../model/replay_event_guards';
import type { ReplayEvent } from '../types';
import type { RrwebModule } from './load_rrweb';
import type { ReplayerSession, ReplayerSessionFactory, ViewportSize } from './types';
import { CANVAS_PLACEHOLDER_RULE } from './canvas_placeholder';

const isCanvasMutationEvent = (event: ReplayEvent): event is canvasEventWithTime =>
  event.type === EventType.IncrementalSnapshot &&
  event.data.source === IncrementalSource.CanvasMutation;

const isCanvasElement = (node: Node | null): node is HTMLCanvasElement =>
  node !== null && node.nodeName === 'CANVAS';

const isViewportSize = (value: unknown): value is ViewportSize =>
  typeof value === 'object' &&
  value !== null &&
  'width' in value &&
  typeof value.width === 'number' &&
  'height' in value &&
  typeof value.height === 'number';

const viewportOf = (events: readonly ReplayEvent[]): ViewportSize | undefined => {
  const meta = events.find(isMetaEvent);
  return meta ? { width: meta.data.width, height: meta.data.height } : undefined;
};

/**
 * Wraps rrweb's `Replayer`. The replay iframe keeps rrweb's default sandbox, which runs no script;
 * rrweb's own canvas option would add `allow-scripts`, so canvas events are applied here instead,
 * with the same function rrweb uses, against the canvases rrweb rebuilt.
 */
export const createRrwebSessionFactory =
  ({ Replayer, canvasMutation }: RrwebModule): ReplayerSessionFactory =>
  ({ root, initialEvents, speed, callbacks }): ReplayerSession => {
    const replayer = new Replayer([...initialEvents], {
      root,
      speed,
      skipInactive: false,
      triggerFocus: false,
      insertStyleRules: [CANVAS_PLACEHOLDER_RULE],
    });
    let destroyed = false;
    const imageMap: Parameters<typeof canvasMutation>[0]['imageMap'] = new Map();
    const canvasEventMap: Parameters<typeof canvasMutation>[0]['canvasEventMap'] = new Map();

    replayer.on(ReplayerEvents.Finish, () => {
      if (!destroyed) {
        callbacks.onFinish();
      }
    });
    replayer.on(ReplayerEvents.Resize, (size: unknown) => {
      if (!destroyed && isViewportSize(size)) {
        callbacks.onViewportChange({ width: size.width, height: size.height });
      }
    });
    replayer.on(ReplayerEvents.EventCast, (event: unknown) => {
      if (destroyed || !isReplayEvent(event) || !isCanvasMutationEvent(event)) {
        return;
      }
      const target = replayer.getMirror().getNode(event.data.id);
      if (isCanvasElement(target)) {
        void canvasMutation({
          event,
          mutation: event.data,
          target,
          imageMap,
          canvasEventMap,
          errorHandler: () => undefined,
        });
      }
    });

    const initialViewport = viewportOf(initialEvents);
    if (initialViewport) {
      callbacks.onViewportChange(initialViewport);
    }

    return {
      append: (events) => {
        if (destroyed) {
          return;
        }
        events.forEach((event) => replayer.addEvent(event));
      },
      play: (offsetMs) => {
        if (!destroyed) {
          replayer.play(offsetMs);
        }
      },
      pause: (offsetMs) => {
        if (!destroyed) {
          replayer.pause(offsetMs);
        }
      },
      setSpeed: (nextSpeed) => {
        if (!destroyed) {
          replayer.setConfig({ speed: nextSpeed });
        }
      },
      getCurrentOffsetMs: () => (destroyed ? 0 : replayer.getCurrentTime()),
      getDurationMs: () => (destroyed ? 0 : replayer.getMetaData().totalTime),
      getWrapper: () => (destroyed ? undefined : replayer.wrapper),
      destroy: () => {
        if (destroyed) {
          return;
        }
        destroyed = true;
        try {
          replayer.destroy();
        } catch {
          // The replayer may already be gone when its container was removed first.
        }
      },
    };
  };
