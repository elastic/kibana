/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import { IIndexReader, IIndexWriter, IndexNames } from '../elasticsearch';
import { Event, FieldMap } from '../event_schema';
import { DeepPartial } from '../utils/utility_types';
import { IEventLogDefinition, IEventLog } from './public_api';

export interface IEventLogRegistry {
  get<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    spaceId: string
  ): IEventLogProvider<Event<TMap>> | null;

  add<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    spaceId: string,
    provider: IEventLogProvider<Event<TMap>>
  ): void;

  shutdown(): Promise<void>;
}

export interface IEventLogProvider<TEvent> {
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
