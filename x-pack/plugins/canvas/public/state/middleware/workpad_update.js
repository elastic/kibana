/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { duplicatePage } from '../actions/pages';
import { fetchRenderable } from '../actions/elements';
import { setWriteable } from '../actions/workpad';
import { getPages, isWriteable } from '../selectors/workpad';
import { getWindow } from '../../lib/get_window';

export const workpadUpdate = ({ dispatch, getState }) => next => action => {
  const oldIsWriteable = isWriteable(getState());

  next(action);

  // This middleware fetches all of the renderable elements on new, duplicate page
  if (action.type === duplicatePage.toString()) {
    // When a page has been duplicated, it will be added as the last page, so fetch it
    const pages = getPages(getState());
    const newPage = pages[pages.length - 1];

    // For each element on that page, dispatch the action to update it
    return newPage.elements.forEach(element => dispatch(fetchRenderable(element)));
  }

  // This middleware clears any page selection when the writeable mode changes
  if (action.type === setWriteable.toString() && oldIsWriteable !== isWriteable(getState())) {
    const win = getWindow();

    if (typeof win.getSelection !== 'function') {
      return;
    }

    win.getSelection().collapse(document.querySelector('body'), 0);
  }
};
