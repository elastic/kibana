/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type PayloadType =
  | []
  | [unknown]
  | [unknown, unknown]
  | [unknown, unknown, unknown]
  | [unknown, unknown, unknown, unknown]
  | [unknown, unknown, unknown, unknown, unknown];

/**
 * Returns a function that will produce a Redux action when called
 *
 * @param {String} type
 */
export function createActionFactory<Type extends string, Payload extends PayloadType>(type: Type) {
  interface ActionCreator {
    (...args: Payload): { payload: Payload; type: Type };
    type: Type;
  }

  const actionHandler: ActionCreator = (...args: Payload) => {
    const action = {
      type,
      // All of the actions specified in this project use a standard format where `payload`
      // is an array of the arguments passed to the action creator
      payload: args,
    };

    return action;
  };
  actionHandler.toString = () => type;
  actionHandler.type = type;
  return actionHandler;
}

/**
 * Create a set (`Object`) of Actions based on a list of action types
 *
 * @param {Iterable<string>} actionTypes
 */
export function createActions(actionTypes: Iterable<string>) {
  // FIXME: anyway to infer `actionName` below as one of the values in `actionTypes` input param?
  const actionCreators: {
    [actionType: string]: ReturnType<typeof createActionFactory>;
  } = {};

  for (const type of actionTypes) {
    actionCreators[type] = createActionFactory(type);
  }

  return actionCreators;
}
