/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { IndexSpecification, IIndexWriter, IIndexReader } from '../elasticsearch';
import { EventSchema, FieldMap, Event } from '../event_schema';
import { IEventLog, IEventLogProvider } from './public_api';
import { EventLogBootstrapper } from './event_log_bootstrapper';
import { EventLog } from './event_log';

interface ConstructorParams<TMap extends FieldMap> {
  eventSchema: EventSchema<TMap>;
  indexSpec: IndexSpecification;
  indexReader: IIndexReader;
  indexWriter: IIndexWriter;
  logBootstrapper: EventLogBootstrapper;
  logger: Logger;
}

export class EventLogProvider<TMap extends FieldMap> implements IEventLogProvider<TMap> {
  private readonly eventSchema: EventSchema<TMap>;
  private readonly indexSpec: IndexSpecification;
  private readonly indexReader: IIndexReader;
  private readonly indexWriter: IIndexWriter;
  private readonly logger: Logger; // TODO: use or remove
  private readonly logBootstrapper: EventLogBootstrapper;
  private log: EventLog<Event<TMap>> | null;
  private isIndexBootstrapped: boolean;

  constructor(params: ConstructorParams<TMap>) {
    this.eventSchema = params.eventSchema;
    this.indexSpec = params.indexSpec;
    this.indexReader = params.indexReader;
    this.indexWriter = params.indexWriter;
    this.logger = params.logger.get('EventLogProvider');
    this.logBootstrapper = params.logBootstrapper;
    this.log = null;
    this.isIndexBootstrapped = false;
  }

  public getEventSchema(): EventSchema<TMap> {
    return this.eventSchema;
  }

  public getIndexSpec(): IndexSpecification {
    return this.indexSpec;
  }

  public getLogName(): string {
    return this.indexSpec.indexNames.logName;
  }

  public async getLog(bootstrapIndex: boolean = true): Promise<IEventLog<Event<TMap>>> {
    const { indexNames } = this.indexSpec;
    const { logName } = indexNames;

    if (bootstrapIndex && !this.isIndexBootstrapped) {
      this.logBootstrapper.start();
      const { success } = await this.logBootstrapper.waitUntilFinished();
      this.isIndexBootstrapped = success;

      if (!success) {
        // TODO: or rather log (to console) and return an "empty" EventLog (null object)?
        throw new Error(`Event log bootstrapping failed, logName="${logName}"`);
      }
    }

    if (!this.log) {
      this.log = new EventLog<Event<TMap>>({
        indexNames,
        indexReader: this.indexReader,
        indexWriter: this.indexWriter,
        logger: this.logger,
      });
    }

    return this.log;
  }
}
