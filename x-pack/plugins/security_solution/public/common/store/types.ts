/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Store, Dispatch, Action, Middleware, CombinedState } from 'redux';

import type { CoreStart } from '@kbn/core/public';
import type { DataTableState } from '@kbn/securitysolution-data-table';
import type { StartPlugins } from '../../types';
import type { AppAction } from './actions';
import type { Immutable } from '../../../common/endpoint/types';
import type { AppState } from './app/reducer';
import type { InputsState } from './inputs/reducer';
import type { SourcererState } from '../../sourcerer/store/reducer';
import type { HostsPluginState } from '../../explore/hosts/store';
import type { DragAndDropState } from './drag_and_drop/reducer';
import type { TimelinePluginState } from '../../timelines/store';
import type { NetworkPluginState } from '../../explore/network/store';
import type { ManagementPluginState } from '../../management';
import type { UsersPluginState } from '../../explore/users/store';
import type { GlobalUrlParam } from './global_url_param';
import type { GroupState } from './grouping/types';
import type { SecuritySolutionDiscoverState } from './discover/model';
import type { AnalyzerState } from '../../resolver/types';

export type State = HostsPluginState &
  UsersPluginState &
  NetworkPluginState &
  UsersPluginState &
  TimelinePluginState &
  ManagementPluginState & {
    app: AppState;
    dragAndDrop: DragAndDropState;
    inputs: InputsState;
    sourcerer: SourcererState;
    globalUrlParam: GlobalUrlParam;
    discover: SecuritySolutionDiscoverState;
  } & DataTableState &
  GroupState &
  AnalyzerState;
/**
 * The Redux store type for the Security app.
 */
export type SecurityAppStore = Store<State, Action>;

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
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>
) => ImmutableMiddleware<S, AppAction>;

/**
 * Takes application-standard middleware dependencies
 * and returns an array of redux middleware.
 * Middleware will be of the `ImmutableMiddleware` variety. Not able to directly
 * change actions or state.
 */
export type SecuritySubPluginMiddlewareFactory = (
  coreStart: CoreStart,
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>
) => Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>;

/**
 * Like `Reducer` from `redux` but it accepts immutable versions of `state` and `action`.
 * Use this type for all Reducers in order to help enforce our pattern of immutable state.
 */
export type ImmutableReducer<S, A> = (
  state: Immutable<S> | undefined,
  action: Immutable<A>
) => S | Immutable<S>;

/**
 * A alternate interface for `redux`'s `combineReducers`. Will work with the same underlying implementation,
 * but will enforce that `Immutable` versions of `state` and `action` are received.
 */
export type ImmutableCombineReducers = <M extends ImmutableReducersMapObject<unknown, never>>(
  reducers: M
) => ImmutableReducer<
  CombinedState<StateFromImmutableReducersMapObject<M>>,
  ActionFromImmutableReducersMapObject<M>
>;

/**
 * Helper type for `ImmutableCombineReducers`. Infers the combined state type from an immutable reducer map.
 */
type StateFromImmutableReducersMapObject<M> = M extends ImmutableReducersMapObject<unknown, never>
  ? { [P in keyof M]: M[P] extends ImmutableReducer<infer S, infer _A> ? S : never }
  : never;

/**
 * Helper type for `ImmutableCombineReducers`. Infers the combined action type from an immutable reducer map.
 */
type ActionFromImmutableReducersMapObject<M> = M extends ImmutableReducersMapObject<unknown, never>
  ? ActionFromImmutableReducer<ImmutableReducerFromImmutableReducersMapObject<M>>
  : never;

/**
 * Helper type for `ImmutableCombineReducers`. Infers the combined reducer type from an immutable reducer map.
 */
type ImmutableReducerFromImmutableReducersMapObject<M> = M extends {
  [P in keyof M]: infer R;
}
  ? R extends ImmutableReducer<infer _S, infer _A>
    ? R
    : never
  : never;

/**
 * Helper type for `ImmutableCombineReducers`. Infers the action type for an immutable reducer.
 */
type ActionFromImmutableReducer<R> = R extends ImmutableReducer<infer _S, infer A> ? A : never;

/**
 * Helper type for `ImmutableCombineReducers`.
 * Like `redux`'s `ReducersMapObject` (which is used by `combineReducers`) but enforces that
 * the `state` and `action` received are `Immutable` versions.
 */
type ImmutableReducersMapObject<S, A extends Action = Action> = {
  [K in keyof S]: ImmutableReducer<S[K], A>;
};

/**
 * A better type for createStructuredSelector. This doesn't support the options object.
 * https://github.com/reduxjs/reselect/pull/454
 */
export type CreateStructuredSelector = <
  SelectorMap extends { [key: string]: (...args: never[]) => unknown }
>(
  selectorMap: SelectorMap
) => (state: SelectorMap[keyof SelectorMap] extends (state: infer S) => unknown ? S : never) => {
  [Key in keyof SelectorMap]: ReturnType<SelectorMap[Key]>;
};
