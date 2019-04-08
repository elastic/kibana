/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * The helper types and functions below are designed to be used with constate
 * v0.9. From version 1.0 the use of react hooks probably makes them
 * unnecessary.
 *
 * The `inferActionMap`, `inferEffectMap` and `inferSelectorMap` functions
 * remove the necessity to type out the child-facing interfaces as suggested in
 * the constate typescript documentation by inferring the `ActionMap`,
 * `EffectMap` and `SelectorMap` types from the object passed as an argument.
 * At runtime these functions just return their first argument without
 * modification.
 *
 * Until partial type argument inference is (hopefully) introduced with
 * TypeScript 3.3, the functions are split into two nested functions to allow
 * for specifying the `State` type argument while leaving the other type
 * arguments for inference by the compiler.
 *
 * Example Usage:
 *
 * ```typescript
 * const actions = inferActionMap<State>()({
 *   increment: (amount: number) => state => ({ ...state, count: state.count + amount }),
 * });
 * // actions has type ActionMap<State, { increment: (amount: number) => void; }>
 * ```
 */

import { ActionMap, EffectMap, EffectProps, SelectorMap } from 'constate';

/**
 * actions
 */

type InferredAction<State, Action> = Action extends (...args: infer A) => (state: State) => State
  ? (...args: A) => void
  : never;

type InferredActions<State, Actions> = ActionMap<
  State,
  { [K in keyof Actions]: InferredAction<State, Actions[K]> }
>;

export type ActionsFromMap<M> = M extends ActionMap<any, infer A> ? A : never;

export const inferActionMap = <State extends any>() => <
  Actions extends {
    [key: string]: (...args: any[]) => (state: State) => State;
  }
>(
  actionMap: Actions
): InferredActions<State, Actions> => actionMap as any;

/**
 * effects
 */

type InferredEffect<State, Effect> = Effect extends (
  ...args: infer A
) => (props: EffectProps<State>) => infer R
  ? (...args: A) => R
  : never;

type InferredEffects<State, Effects> = EffectMap<
  State,
  { [K in keyof Effects]: InferredEffect<State, Effects[K]> }
>;

export type EffectsFromMap<M> = M extends EffectMap<any, infer E> ? E : never;

export const inferEffectMap = <State extends any>() => <
  Effects extends {
    [key: string]: (...args: any[]) => (props: EffectProps<State>) => any;
  }
>(
  effectMap: Effects
): InferredEffects<State, Effects> => effectMap as any;

/**
 * selectors
 */

type InferredSelector<State, Selector> = Selector extends (
  ...args: infer A
) => (state: State) => infer R
  ? (...args: A) => R
  : never;

type InferredSelectors<State, Selectors> = SelectorMap<
  State,
  { [K in keyof Selectors]: InferredSelector<State, Selectors[K]> }
>;

export type SelectorsFromMap<M> = M extends SelectorMap<any, infer S> ? S : never;

export const inferSelectorMap = <State extends any>() => <
  Selectors extends {
    [key: string]: (...args: any[]) => (state: State) => any;
  }
>(
  selectorMap: Selectors
): InferredSelectors<State, Selectors> => selectorMap as any;
