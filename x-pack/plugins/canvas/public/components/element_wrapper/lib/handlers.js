/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setFilter } from '../../../state/actions/elements';

export const createHandlers = dispatch => {
  let isComplete = false;
  let completeFn = () => {};

  return (element, pageId) => {
    // TODO: reset isComplete when expression changes
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
        // don't emit if the element is already done
        if (isComplete) {
          return;
        }

        isComplete = true;
        completeFn();
      },
    };
  };
};
