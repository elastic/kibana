/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, EventLogDefinition } from '../common';

import { IEventLog, IEventLogResolver } from './public_api';
import { IEventLogRegistry, IEventLogProvider } from './internal_api';
import { EventLogObjectFactory } from './event_log_object_factory';
import { EventLogProvider } from './event_log_provider';
import { BootstrappingResult } from './bootstrapper_of_common_resources';

export class EventLogResolver implements IEventLogResolver {
  constructor(
    private readonly factory: EventLogObjectFactory,
    private readonly registry: IEventLogRegistry,
    private readonly isMechanismReady: Promise<BootstrappingResult>,
    private readonly bootstrapLog: boolean
  ) {}

  public async resolve<TEvent extends CommonFields>(
    logDefinition: EventLogDefinition<TEvent>,
    kibanaSpaceId: string
  ): Promise<IEventLog<TEvent>> {
    const provider = this.resolveLogProvider(logDefinition, kibanaSpaceId);

    if (this.bootstrapLog) {
      await provider.bootstrapLog();
    }

    return provider.getLog();
  }

  private resolveLogProvider<TEvent extends CommonFields>(
    logDefinition: EventLogDefinition<TEvent>,
    kibanaSpaceId: string
  ): IEventLogProvider<TEvent> {
    const { factory, registry, isMechanismReady } = this;

    const existingProvider = registry.get(logDefinition, kibanaSpaceId);
    if (existingProvider) {
      return existingProvider;
    }

    const indexSpec = factory.createIndexSpec(logDefinition, kibanaSpaceId);
    const indexReader = factory.createIndexReader(indexSpec);
    const indexWriter = factory.createIndexWriter(indexSpec);
    const logBootstrapper = factory.createBootstrapperOfLogResources(indexSpec, isMechanismReady);
    const log = factory.createEventLog<TEvent>(indexSpec, indexReader, indexWriter);
    const logProvider = new EventLogProvider({
      log,
      logBootstrapper,
      indexWriter,
    });

    registry.add(logDefinition, kibanaSpaceId, logProvider);

    return logProvider;
  }
}
