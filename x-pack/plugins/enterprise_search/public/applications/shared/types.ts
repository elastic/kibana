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
  mount(): void;
  values: IKeaValues;
  actions: IKeaActions;
  reducers(): object;
  selectors?(): object;
  listeners?(): object;
}

export interface IKeaSelectors<IKeaValues> {
  selectors: IKeaValues;
}

export interface IKeaListeners<IKeaActions> {
  actions: IKeaActions;
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
      [Action in keyof IKeaActions]?: (state: IKeaValues, payload: IKeaValues) => IKeaValues[Value];
    }
  ];
};
