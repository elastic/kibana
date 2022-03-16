/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'react';
import { CommandServiceInterface } from '../../types';

export interface ConsoleDataState {
  commandService: CommandServiceInterface;
  scrollToBottom: () => void;
}

export type ConsoleDataAction = { type: 'scrollDown' } | { type: 'test2' };

export interface ConsoleStore {
  state: ConsoleDataState;
  dispatch: Dispatch<ConsoleDataAction>;
}
