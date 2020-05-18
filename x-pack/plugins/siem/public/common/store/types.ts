/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Dispatch,
  Action as ReduxAction,
  AnyAction as ReduxAnyAction,
  Action,
  Middleware,
} from 'redux';

import { CoreStart } from '../../../../../../src/core/public';
import { Immutable } from '../../../common/endpoint_alerts/types';
import { State } from './reducer';
import { StartPlugins } from '../../plugin';
import { AppAction } from './actions';

export type KueryFilterQueryKind = 'kuery' | 'lucene';

export interface KueryFilterQuery {
  kind: KueryFilterQueryKind;
  expression: string;
}

export interface SerializedFilterQuery {
  kuery: KueryFilterQuery | null;
  serializedQuery: string;
}

/**
 * like redux's `MiddlewareAPI` but `getState` returns an `Immutable` version of
 * state and `dispatch` accepts `Immutable` versions of actions.
 */
export interface ImmutableMiddlewareAPI<S, A extends Action> {
  dispatch: Dispatch<A | Immutable<A>>;
  getState(): Immutable<S>;
}

/**
 * Like redux's `Middleware` but without the ability to mutate actions or state.
 * Differences:
 *   * `getState` returns an `Immutable` version of state
 *   * `dispatch` accepts `Immutable` versions of actions
 *   * `action`s received will be `Immutable`
 */
export type ImmutableMiddleware<S, A extends Action> = (
  api: ImmutableMiddlewareAPI<S, A>
) => (next: Dispatch<A | Immutable<A>>) => (action: Immutable<A>) => unknown;

/**
 * Takes application-standard middleware dependencies
 * and returns a redux middleware.
 * Middleware will be of the `ImmutableMiddleware` variety. Not able to directly
 * change actions or state.
 */
export type ImmutableMiddlewareFactory<S = State> = (
  coreStart: CoreStart,
  depsStart: Pick<StartPlugins, 'data' | 'ingestManager'>
) => ImmutableMiddleware<S, AppAction>;

/**
 * Simple type for a redux selector.
 */
type Selector<S, R> = (state: S) => R;

/**
 * Takes a selector and an `ImmutableMiddleware`. The
 * middleware's version of `getState` will receive
 * the result of the selector instead of the global state.
 *
 * This allows middleware to have knowledge of only a subsection of state.
 *
 * `selector` returns an `Immutable` version of the substate.
 * `middleware` must be an `ImmutableMiddleware`.
 *
 * Returns a regular middleware, meant to be used with `applyMiddleware`.
 */
export type SubstateMiddlewareFactory = <Substate>(
  selector: Selector<State, Immutable<Substate>>,
  middleware: ImmutableMiddleware<Substate, AppAction>
) => Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>;

/**
 * Like `Reducer` from `redux` but it accepts immutable versions of `state` and `action`.
 * Use this type for all Reducers in order to help enforce our pattern of immutable state.
 */
export type ImmutableReducer<State, Action> = (
  state: Immutable<State> | undefined,
  action: Immutable<Action>
) => State | Immutable<State>;

/**
 * A alternate interface for `redux`'s `combineReducers`. Will work with the same underlying implementation,
 * but will enforce that `Immutable` versions of `state` and `action` are received.
 */
export type ImmutableCombineReducers = <S, A extends ReduxAction = ReduxAnyAction>(
  reducers: ImmutableReducersMapObject<S, A>
) => ImmutableReducer<S, A>;

/**
 * Like `redux`'s `ReducersMapObject` (which is used by `combineReducers`) but enforces that
 * the `state` and `action` received are `Immutable` versions.
 */
type ImmutableReducersMapObject<S, A extends ReduxAction = ReduxAction> = {
  [K in keyof S]: ImmutableReducer<S[K], A>;
};

/**
 * A better type for createStructuredSelector. This doesn't support the options object.
 */
export type CreateStructuredSelector = <
  SelectorMap extends { [key: string]: (...args: never[]) => unknown }
>(
  selectorMap: SelectorMap
) => (
  state: SelectorMap[keyof SelectorMap] extends (state: infer State) => unknown ? State : never
) => {
  [Key in keyof SelectorMap]: ReturnType<SelectorMap[Key]>;
};
