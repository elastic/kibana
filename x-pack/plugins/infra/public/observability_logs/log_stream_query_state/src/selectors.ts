/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import stringify from 'json-stable-stringify';
import { type EmittedFrom } from 'xstate';
import { type LogStreamQueryActorRef } from './state_machine';

export const selectParsedQuery = (state: EmittedFrom<LogStreamQueryActorRef>) =>
  state.matches('hasQuery') ? state.context.parsedQuery : undefined;

export const useParsedQuery = (logStreamQueryActor: LogStreamQueryActorRef) =>
  useSelector(logStreamQueryActor, selectParsedQuery);

export const useSerializedParsedQuery = (logStreamQueryActor: LogStreamQueryActorRef) =>
  useSelector(logStreamQueryActor, (state) => {
    const query = selectParsedQuery(state);
    return query != null ? stringify(query) : null;
  });
