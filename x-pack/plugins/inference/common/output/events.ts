/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerSentEventBase } from '@kbn/sse-utils';

export enum OutputEventType {
  OutputUpdate = 'output',
  OutputComplete = 'complete',
}

export type Output = Record<string, any> | undefined | unknown;

export type OutputUpdateEvent<TId extends string = string> = ServerSentEventBase<
  OutputEventType.OutputUpdate,
  {
    id: TId;
    content: string;
  }
>;

export type OutputCompleteEvent<
  TId extends string = string,
  TOutput extends Output = Output
> = ServerSentEventBase<
  OutputEventType.OutputComplete,
  {
    id: TId;
    output: TOutput;
    content: string;
  }
>;

export type OutputEvent<TId extends string = string, TOutput extends Output = Output> =
  | OutputUpdateEvent<TId>
  | OutputCompleteEvent<TId, TOutput>;
