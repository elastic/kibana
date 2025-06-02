/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeMap, OperatorFunction, of } from 'rxjs';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import { AgentRunEvents } from '../types';
import { buildEventsConverter } from './build_events_converter';

function filterMap<T, R>(project: (value: T) => R[]): OperatorFunction<T, R> {
  return mergeMap((value: T) => {
    const result = project(value);
    return of(...result);
  });
}

export const convertGraphEvents = (): OperatorFunction<LangchainStreamEvent, AgentRunEvents> => {
  const eventConverter = buildEventsConverter();
  return (langchain$) => {
    return langchain$.pipe(filterMap<LangchainStreamEvent, AgentRunEvents>(eventConverter));
  };
};
