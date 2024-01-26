/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable no-console */

import { State } from 'xstate';

export const logXStateTransition = (state: State<any, any, any, any, any>) => {
  console.group(
    `%c${state.machine?.id} %cevent %c${state.event.type}: %c${state.history?.value}%c ⟶ %c${state.value}`,
    'font-weight: bold;',
    'color: gray; font-weight: lighter;',
    '',
    'text-decoration: underline;',
    '',
    'text-decoration: underline;'
  );
  console.log(
    '%cprev state',
    'color: #9E9E9E; font-weight: bold;',
    state.history?.value,
    state.history
  );
  console.log('%cevent', 'color: #03A9F4; font-weight: bold;', state.event);
  console.log('%cnext state', 'color: #4CAF50; font-weight: bold;', state.value, state);
  console.groupEnd();
};
