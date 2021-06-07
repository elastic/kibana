/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import { CommonFields, EventLogDefinition, IndexNames } from '../common';
import { IIndexReader, IIndexWriter } from '../elasticsearch';
import { DeepPartial } from '../utils/utility_types';
import { IEventLog } from './public_api';

export interface IEventLogRegistry {
  get<TEvent extends CommonFields>(
    definition: EventLogDefinition<TEvent>,
    spaceId: string
  ): IEventLogProvider<TEvent> | null;

  add<TEvent extends CommonFields>(
    definition: EventLogDefinition<TEvent>,
    spaceId: string,
    provider: IEventLogProvider<TEvent>
  ): void;

  shutdown(): Promise<void>;
}

export interface IEventLogProvider<TEvent extends CommonFields> {
  getLog(): IEventLog<TEvent>;
  bootstrapLog(): Promise<void>;
  shutdownLog(): Promise<void>;
}

export interface EventLogParams {
  indexNames: IndexNames;
  indexReader: IIndexReader;
  indexWriter: IIndexWriter;
  logger: Logger;
}

export interface EventLoggerParams<TEvent> extends EventLogParams {
  eventLoggerName: string;
  eventFields: DeepPartial<TEvent>;
}
