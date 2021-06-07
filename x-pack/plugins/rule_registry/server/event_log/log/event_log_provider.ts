/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields } from '../common';
import { IIndexWriter } from '../elasticsearch';
import { IEventLog } from './public_api';
import { IEventLogProvider } from './internal_api';
import { BootstrapperOfLogResources } from './bootstrapper_of_log_resources';

interface ConstructorParams<TEvent extends CommonFields> {
  log: IEventLog<TEvent>;
  logBootstrapper: BootstrapperOfLogResources;
  indexWriter: IIndexWriter;
}

export class EventLogProvider<TEvent extends CommonFields> implements IEventLogProvider<TEvent> {
  constructor(private readonly params: ConstructorParams<TEvent>) {}

  public getLog(): IEventLog<TEvent> {
    return this.params.log;
  }

  public async bootstrapLog(): Promise<void> {
    await this.params.logBootstrapper.run();
  }

  public async shutdownLog(): Promise<void> {
    await this.params.indexWriter.close();
  }
}
