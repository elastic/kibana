/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from 'src/core/server';
import { actionsClientMock } from '../../../../../actions/server/mocks';
import {
  getActions,
  getActionTypes,
  getActionExecuteResults,
} from '../__mocks__/request_responses';

export const createActionsClient = () => {
  const actionsMock = actionsClientMock.create();
  actionsMock.getAll.mockImplementation(() => Promise.resolve(getActions()));
  actionsMock.listTypes.mockImplementation(() => Promise.resolve(getActionTypes()));
  actionsMock.get.mockImplementation(({ id }) => {
    const actions = getActions();
    const action = actions.find((a) => a.id === id);
    if (action) {
      return Promise.resolve(action);
    } else {
      return Promise.reject(SavedObjectsErrorHelpers.createGenericNotFoundError('action', id));
    }
  });
  actionsMock.execute.mockImplementation(({ actionId }) =>
    Promise.resolve(getActionExecuteResults(actionId))
  );

  return actionsMock;
};
