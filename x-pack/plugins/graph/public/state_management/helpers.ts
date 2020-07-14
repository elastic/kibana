/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator, AnyAction } from 'typescript-fsa';

/**
 * Infers the type of an action out of a given action type.
 * This makes it easier to distribute the action types because they come
 * along with the creators: `type MyAction = InferActionType<typeof myActionCreator>`.
 *
 * This isn't expected to be used in a lot of places - if it is, naming the individual
 * action types might make more sense.
 */
export type InferActionType<X> = X extends ActionCreator<infer T> ? T : never;

/**
 * Helper to create a matcher that matches all passed in action creators.
 *
 * This is helpful to create a saga that takes multiple actions:
 * `yield takeEvery(matchesOne(actionCreator1, actionCreator2), handler);`
 *
 * @param actionCreators The action creators to create a unified matcher for
 */
export const matchesOne = (...actionCreators: Array<ActionCreator<any>>) => (action: AnyAction) =>
  actionCreators.some((actionCreator) => actionCreator.match(action));
