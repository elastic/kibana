/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export const inferSelectorMap = <State extends any>() => <
  Selectors extends {
    [key: string]: (...args: any[]) => (state: State) => any;
  }
>(
  selectorMap: Selectors
): InferredSelectors<State, Selectors> => selectorMap as any;
