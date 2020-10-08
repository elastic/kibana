/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAllElements } from '../selectors/workpad';
import { clearValues } from '../actions/resolved_args';

/**
 * This middleware is responsible for keeping the resolved_args collection in transient state
 * synced with the elements represented by the workpad.
 */
export const resolvedArgs = ({ dispatch, getState }) => (next) => (action) => {
  // Get the Element IDs that are present before the action.
  const startElementIds = getAllElements(getState()).map((element) => element.id);

  // execute the action
  next(action);

  // Get the Element IDs after the action...
  const resolvedElementIds = getAllElements(getState()).map((element) => element.id);
  // ...and get a list of IDs that are no longer present.
  const deadIds = startElementIds.filter((id) => !resolvedElementIds.includes(id));

  // If we have some dead elements, we need to clear them from resolved_args collection
  // in transient state.
  if (deadIds.length > 0) {
    dispatch(clearValues(deadIds));
  }
};
