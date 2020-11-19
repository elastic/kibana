/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { duplicatePage } from '../actions/pages';
import { fetchAllRenderables } from '../actions/elements';
import { setWriteable } from '../actions/workpad';
import { getWorkpadName, isWriteable } from '../selectors/workpad';
import { getWindow } from '../../lib/get_window';
import { setDocTitle } from '../../lib/doc_title';

export const workpadUpdate = ({ dispatch, getState }) => (next) => (action) => {
  const oldIsWriteable = isWriteable(getState());
  const oldName = getWorkpadName(getState());

  next(action);

  // This middleware updates the page title when the workpad name changes
  if (getWorkpadName(getState()) !== oldName) {
    setDocTitle(getWorkpadName(getState()));
  }

  // This middleware fetches all of the renderable elements on new, duplicate page
  if (action.type === duplicatePage.toString()) {
    dispatch(fetchAllRenderables());
  }

  // This middleware clears any page selection when the writeable mode changes
  if (action.type === setWriteable.toString() && oldIsWriteable !== isWriteable(getState())) {
    const win = getWindow();

    // check for browser feature before using it
    if (typeof win.getSelection === 'function') {
      win.getSelection().collapse(document.querySelector('body'), 0);
    }
  }
};
