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

export function actionCreatorFactory<Type extends string, Payload extends PayloadType>(type: Type) {
  const actionHandler = (...args: Payload) => {
    const action = {
      type,
      // All of the actions specified in this project use a standard format where `payload` is an array of the arguments passed to the action creator
      payload: args,
    };

    return action;
  };
  actionHandler.toString = () => type;
  actionHandler.type = type;
  return actionHandler;
}

// eslint-disable-next-line import/no-default-export
export default function(actionTypes: Iterable<string>) {
  const actionCreators: {
    [actionName: string]: ReturnType<typeof actionCreatorFactory>;
  } = {};

  for (const type of actionTypes) {
    actionCreators[type] = actionCreatorFactory(type);
  }

  return actionCreators;
}
