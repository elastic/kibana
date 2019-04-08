/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setFilter } from '../../../state/actions/elements';

export function createHandlers(element, pageId, dispatch) {
  let isComplete = false;
  let completeFn = () => {};

  return {
    setFilter(text) {
      dispatch(setFilter(text, element.id, pageId, true));
    },

    getFilter() {
      return element.filter;
    },

    onComplete(fn) {
      completeFn = fn;
    },

    done() {
      if (isComplete) {
        return;
      } // don't emit if the element is already done
      isComplete = true;
      completeFn();
    },
  };
}
