/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Reducer } from 'react';
import { ConsoleDataAction, ConsoleDataState } from './types';

export type InitialStateInterface = Pick<ConsoleDataState, 'commandService' | 'scrollToBottom'>;

export const initiateState = ({
  commandService,
  scrollToBottom,
}: InitialStateInterface): ConsoleDataState => {
  return {
    commandService,
    scrollToBottom,
  };
};

export const stateDataReducer: Reducer<ConsoleDataState, ConsoleDataAction> = (state, action) => {
  return state;
};
