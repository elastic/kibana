/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { ExpressionRendererEvent } from 'src/plugins/expressions/public';
// @ts-expect-error untyped local
import { setFilter } from '../state/actions/elements';
import { updateEmbeddableExpression, fetchEmbeddableRenderable } from '../state/actions/embeddable';
import {
  CanvasElement,
  getDefaultHandlers,
  InterpreterRenderHandlers,
  CanvasSpecificRendererHandlers,
} from '../../types';

// This class creates stub handlers to ensure every element and renderer fulfills the contract.
// TODO: consider warning if these methods are invoked but not implemented by the renderer...?

// We need to move towards only using these handlers and ditching our canvas specific ones
export const createHandlers = (): InterpreterRenderHandlers<CanvasSpecificRendererHandlers> => {
  return {
    ...getDefaultHandlers<CanvasSpecificRendererHandlers>(),
    destroy() {},
    getElementId() {
      return '';
    },
    getFilter() {
      return '';
    },
    setFilter() {},
    onComplete(fn: () => void) {
      this.done = fn;
    },

    onResize(fn: (size: { height: number; width: number }) => void) {
      this.resize = fn;
    },

    embeddableDestroyed() {},
    embeddableInputChange() {},
    resize(_size: { height: number; width: number }) {},
  };
};

export const assignHandlers = (
  handlers: Partial<InterpreterRenderHandlers<CanvasSpecificRendererHandlers>> = {}
): InterpreterRenderHandlers<CanvasSpecificRendererHandlers> =>
  Object.assign(createHandlers(), handlers);

// TODO: this is a legacy approach we should unravel in the near future.
export const createDispatchedHandlerFactory = (
  dispatch: (action: any) => void
): ((element: CanvasElement) => InterpreterRenderHandlers<CanvasSpecificRendererHandlers>) => {
  let isComplete = false;
  let oldElement: CanvasElement | undefined;

  return (element: CanvasElement) => {
    // reset isComplete when element changes
    if (!isEqual(oldElement, element)) {
      isComplete = false;
      oldElement = element;
    }

    const defaultHandlers = createHandlers();
    const handlers = {
      ...defaultHandlers,
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

      setFilter(text: string) {
        dispatch(setFilter(text, element.id, true));
      },

      getFilter() {
        return element.filter || '';
      },

      onComplete(fn: () => void | boolean) {
        defaultHandlers.on('done', fn);
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

    return Object.assign(defaultHandlers, handlers);
  };
};
