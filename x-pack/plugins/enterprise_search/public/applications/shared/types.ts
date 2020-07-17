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

export interface IKeaReducers<IKeaValues> {
  [value: string]: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any, // The default state for the value - can be anything
    {
      [action: string]: (state: IKeaValues, payload: IKeaValues) => void; // Returns new state
    }
  ];
}
