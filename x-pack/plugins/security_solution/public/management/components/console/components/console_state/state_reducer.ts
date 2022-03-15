/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Reducer } from 'react';
import { ConsoleDataAction, ConsoleDataState } from './types';
import { CommandServiceInterface } from '../../types';

export const initiateState = ({
  commandService,
}: {
  commandService: CommandServiceInterface;
}): ConsoleDataState => {
  return {
    commandService,
  };
};

export const stateDataReducer: Reducer<ConsoleDataState, ConsoleDataAction> = (state, action) => {
  return state;
};
