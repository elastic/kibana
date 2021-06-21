/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import {
  ExpressionRendererEvent,
  IInterpreterRenderHandlers,
} from 'src/plugins/expressions/public';
// @ts-expect-error untyped local
import { setFilter } from '../state/actions/elements';
import { updateEmbeddableExpression, fetchEmbeddableRenderable } from '../state/actions/embeddable';
import { RendererHandlers, CanvasElement } from '../../types';

// This class creates stub handlers to ensure every element and renderer fulfills the contract.
// TODO: consider warning if these methods are invoked but not implemented by the renderer...?

// We need to move towards only using these handlers and ditching our canvas specific ones
export const createBaseHandlers = (): IInterpreterRenderHandlers => ({
  done() {},
  reload() {},
  update() {},
  event() {},
  onDestroy() {},
  getRenderMode: () => 'display',
  isSyncColorsEnabled: () => false,
  on: (event: any, fn: (...args: any) => void) => {},
});

interface RenderEmitters {
  done: () => boolean | void;
  resize: (_size: { height: number; width: number }) => boolean | void;
  embeddableDestroyed: () => boolean | void;
  embeddableInputChange: (embeddableExpression: string) => boolean | void;
}

interface RenderListeners {
  complete: Pick<RenderEmitters, 'done'>;
  resize: Pick<RenderEmitters, 'resize'>;
  embeddableDestroyed: Pick<RenderEmitters, 'embeddableDestroyed'>;
  embeddableInputChange: Pick<RenderEmitters, 'embeddableInputChange'>;
}

export const createHandlers = (baseHandlers = createBaseHandlers()): RendererHandlers => ({
  ...baseHandlers,
  destroy() {},

  getElementId() {
    return '';
  },
  getFilter() {
    return '';
  },

  onComplete(fn: () => void) {
    this.done = fn;
  },

  onResize(fn: (size: { height: number; width: number }) => void) {
    this.resize = fn;
  },

  embeddableDestroyed() {},
  embeddableInputChange() {},
  resize(_size: { height: number; width: number }) {},
  setFilter() {},
});

export const assignHandlers = (handlers: Partial<RendererHandlers> = {}): RendererHandlers =>
  Object.assign(createHandlers(), handlers);

// TODO: this is a legacy approach we should unravel in the near future.
export const createDispatchedHandlerFactory = (
  dispatch: (action: any) => void
): ((element: CanvasElement) => RendererHandlers) => {
  let isComplete = false;
  let oldElement: CanvasElement | undefined;

  return (element: CanvasElement) => {
    // reset isComplete when element changes
    if (!isEqual(oldElement, element)) {
      isComplete = false;
      oldElement = element;
    }

    const handlers: RendererHandlers & {
      event: IInterpreterRenderHandlers['event'];
      done: IInterpreterRenderHandlers['done'];
    } & RenderEmitters = {
      ...createHandlers(),
      event(event: ExpressionRendererEvent) {
        switch (event.name) {
          case 'embeddableInputChange':
            this.embeddableInputChange(event.data);
            break;
          case 'setFilter':
            this.setFilter(event.data);
            break;
          case 'embeddableDestroyed':
            this.embeddableDestroyed();
            break;
          case 'resize':
            this.resize(event.data);
            break;
        }
      },
      on(event: keyof RenderListeners, fn: (...args: any[]) => void) {
        const listenerToEvent: { [k in keyof RenderListeners]: keyof RenderEmitters } = {
          complete: 'done',
          resize: 'resize',
          embeddableDestroyed: 'embeddableDestroyed',
          embeddableInputChange: 'embeddableInputChange',
        };

        if (listenerToEvent[event]) {
          const eventCall: ((...args: any[]) => boolean | void) | null =
            typeof this[listenerToEvent[event]] === 'function'
              ? this[listenerToEvent[event]]
              : null;

          if (!eventCall) return true;

          this[listenerToEvent[event]] = (...args: any[]) => {
            const preventFromCallingListener: void | boolean = eventCall(...args);
            if (fn && typeof fn === 'function' && !preventFromCallingListener) {
              fn(...args);
            }
          };
        }
      },

      setFilter(text: string) {
        dispatch(setFilter(text, element.id, true));
      },

      getFilter() {
        return element.filter;
      },

      onComplete(fn: () => void | boolean) {
        this.on('complete', fn);
      },

      getElementId: () => element.id,

      embeddableInputChange(embeddableExpression: string) {
        dispatch(updateEmbeddableExpression({ elementId: element.id, embeddableExpression }));
      },

      embeddableDestroyed() {
        dispatch(fetchEmbeddableRenderable(element.id));
      },

      done() {
        // don't emit if the element is already done
        if (isComplete) return true;

        isComplete = true;
      },
    };

    Object.keys(handlers).forEach((value: string) => {
      const key = value as keyof typeof handlers;
      if (handlers[key] && typeof handlers[key] === 'function') {
        handlers[key] = (handlers[key] as Function).bind(handlers);
      }
    });

    return handlers;
  };
};
