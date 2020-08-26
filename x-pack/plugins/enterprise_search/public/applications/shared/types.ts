/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IFlashMessagesProps {
  info?: string[];
  warning?: string[];
  error?: string[];
  success?: string[];
  isWrapped?: boolean;
  children?: React.ReactNode;
}

export interface IKeaLogic<IKeaValues, IKeaActions> {
  mount(): Function;
  values: IKeaValues;
  actions: IKeaActions;
}

/**
 * This reusable interface mostly saves us a few characters / allows us to skip
 * defining params inline. Unfortunately, the return values *do not work* as
 * expected (hence the voids).  While I can tell selectors to use TKeaSelectors,
 * the return value is *not* properly type checked if it's not declared inline. :/
 *
 * Also note that if you switch to Kea 2.1's plain object notation -
 * `selectors: {}` vs. `selectors: () => ({})`
 * - type checking also stops working and type errors become significantly less
 * helpful - showing less specific error messages and highlighting. 👎
 */
export interface IKeaParams<IKeaValues, IKeaActions> {
  selectors?(params: { selectors: IKeaValues }): void;
  listeners?(params: { actions: IKeaActions; values: IKeaValues }): void;
  events?(params: { actions: IKeaActions; values: IKeaValues }): void;
}

/**
 * This reducers() type checks that:
 *
 * 1. The value object keys are defined within IKeaValues
 * 2. The default state (array[0]) matches the type definition within IKeaValues
 * 3. The action object keys (array[1]) are defined within IKeaActions
 * 3. The new state returned by the action matches the type definition within IKeaValues
 */
export type TKeaReducers<IKeaValues, IKeaActions> = {
  [Value in keyof IKeaValues]?: [
    IKeaValues[Value],
    {
      [Action in keyof IKeaActions]?: (
        state: IKeaValues[Value],
        payload: IKeaValues
      ) => IKeaValues[Value];
    }
  ];
};

/**
 * This selectors() type checks that:
 *
 * 1. The object keys are defined within IKeaValues
 * 2. The selected values are defined within IKeaValues
 * 3. The returned value match the type definition within IKeaValues
 *
 * The unknown[] and any[] are unfortunately because I have no idea how to
 * assert for arbitrary type/values as an array
 */
export type TKeaSelectors<IKeaValues> = {
  [Value in keyof IKeaValues]?: [
    (selectors: IKeaValues) => unknown[],
    (...args: any[]) => IKeaValues[Value] // eslint-disable-line @typescript-eslint/no-explicit-any
  ];
};
