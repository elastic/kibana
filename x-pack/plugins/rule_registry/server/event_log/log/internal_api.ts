/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import { IIndexReader, IIndexWriter, IndexNames } from '../elasticsearch';
import { FieldMap } from '../event_schema';
import { DeepPartial } from '../utils/utility_types';
import { IEventLogDefinition, IEventLogProvider } from './public_api';

export interface IEventLogRegistry {
  get<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    spaceId: string
  ): IEventLogProvider<TMap> | null;

  add<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    spaceId: string,
    provider: IEventLogProvider<TMap>,
    closeLog: () => Promise<void>
  ): void;
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
