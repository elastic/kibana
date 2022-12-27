/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { LogStreamQueryActorRef } from '../../../log_stream_query_state';
import { MatchedStateFromActor } from '../../../xstate_helpers';
import { LogStreamPageActorRef } from './state_machine';

export const useLogStreamQueryChildService = (
  logStreamPageStateService: LogStreamPageActorRef
): LogStreamQueryActorRef =>
  useSelector(logStreamPageStateService, (state) => state.children.logStreamQuery);

type LogStreamPageStateWithLogViewIndices =
  | MatchedStateFromActor<LogStreamPageActorRef, 'hasLogViewIndices'>
  | MatchedStateFromActor<LogStreamPageActorRef, { hasLogViewIndices: 'initialized' }>
  | MatchedStateFromActor<LogStreamPageActorRef, { hasLogViewIndices: 'uninitialized' }>;

export const selectLogStreamQueryChildService = (
  state: LogStreamPageStateWithLogViewIndices
): LogStreamQueryActorRef => state.children.logStreamQuery;

// TODO: maybe just throw when narrowing the state argument doesn't work?
// export const selectLogStreamQueryChildService = (
//   state: LogStreamPageState
// ): LogStreamQueryActorRef => {
//   const { logStreamQuery } = state.children;

//   if (logStreamQuery == null) {
//     throw new Error('Failed to access LogStreamQuery child service.');
//   }

//   return logStreamQuery;
// };
