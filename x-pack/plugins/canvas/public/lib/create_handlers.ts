/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
// @ts-ignore untyped local
import { setFilter } from '../state/actions/elements';
import { updateEmbeddableExpression, fetchEmbeddableRenderable } from '../state/actions/embeddable';
import { RendererHandlers, CanvasElement } from '../../types';

// This class creates stub handlers to ensure every element and renderer fulfills the contract.
// TODO: consider warning if these methods are invoked but not implemented by the renderer...?

export const createHandlers = (): RendererHandlers => ({
  destroy() {},
  done() {},
  event() {},
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
  reload() {},
  resize(_size: { height: number; width: number }) {},
  setFilter() {},
  update() {},
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

    return assignHandlers({
      setFilter(text: string) {
        dispatch(setFilter(text, element.id, true));
      },

      getFilter() {
        return element.filter;
      },

      onComplete(fn: () => void) {
        completeFn = fn;
      },

      getElementId: () => element.id,

      onEmbeddableInputChange(embeddableExpression: string) {
        dispatch(updateEmbeddableExpression({ elementId: element.id, embeddableExpression }));
      },

      onEmbeddableDestroyed() {
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
    });
  };
};
