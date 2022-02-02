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
import { updateEmbeddableExpression, fetchEmbeddableRenderable } from '../state/actions/embeddable';
import { RendererHandlers, CanvasElement } from '../../types';
import { pluginServices } from '../services';
import { clearValue } from '../state/actions/resolved_args';

// This class creates stub handlers to ensure every element and renderer fulfills the contract.
// TODO: consider warning if these methods are invoked but not implemented by the renderer...?

// We need to move towards only using these handlers and ditching our canvas specific ones
export const createBaseHandlers = (): IInterpreterRenderHandlers => ({
  done() {},
  reload() {},
  update() {},
  event() {},
  onDestroy() {},
  getRenderMode: () => 'view',
  isSyncColorsEnabled: () => false,
  isInteractive: () => true,
});

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

  onDestroy(fn: () => void) {
    this.destroy = fn;
  },

  // TODO: these functions do not match the `onXYZ` and `xyz` pattern elsewhere.
  onEmbeddableDestroyed() {},
  onEmbeddableInputChange() {},
  onResize(fn: (size: { height: number; width: number }) => void) {
    this.resize = fn;
  },

  resize(_size: { height: number; width: number }) {},
});

export const assignHandlers = (handlers: Partial<RendererHandlers> = {}): RendererHandlers =>
  Object.assign(createHandlers(), handlers);

// TODO: this is a legacy approach we should unravel in the near future.
export const createDispatchedHandlerFactory = (
  dispatch: (action: any) => void
): ((element: CanvasElement) => RendererHandlers) => {
  let isComplete = false;
  let oldElement: CanvasElement | undefined;
  let completeFn = () => {};

  return (element: CanvasElement) => {
    // reset isComplete when element changes
    if (!isEqual(oldElement, element)) {
      isComplete = false;
      oldElement = element;
    }

    const { filters } = pluginServices.getServices();

    const handlers: RendererHandlers & {
      event: IInterpreterRenderHandlers['event'];
      done: IInterpreterRenderHandlers['done'];
    } = {
      ...createHandlers(),
      event(event: ExpressionRendererEvent) {
        switch (event.name) {
          case 'embeddableInputChange':
            this.onEmbeddableInputChange(event.data);
            break;
          case 'applyFilterAction':
            filters.updateFilter(element.id, event.data);
            break;
          case 'onComplete':
            this.onComplete(event.data);
            break;
          case 'embeddableDestroyed':
            this.onEmbeddableDestroyed();
            break;
          case 'resize':
            this.resize(event.data);
            break;
          case 'onResize':
            this.onResize(event.data);
            break;
        }
      },
      getFilter() {
        return element.filter || '';
      },

      onComplete(fn: () => void) {
        completeFn = fn;
      },

      getElementId: () => element.id,

      onEmbeddableInputChange(embeddableExpression: string) {
        dispatch(updateEmbeddableExpression({ elementId: element.id, embeddableExpression }));
      },

      onEmbeddableDestroyed() {
        const argumentPath = [element.id, 'expressionRenderable'];
        dispatch(clearValue({ path: argumentPath }));
        dispatch(fetchEmbeddableRenderable(element.id));
      },

      done() {
        // don't emit if the element is already done
        if (isComplete) {
          return;
        }

        isComplete = true;
        completeFn();
      },
    };

    return handlers;
  };
};
