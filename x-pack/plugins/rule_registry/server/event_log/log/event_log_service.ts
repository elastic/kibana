/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';

import { Event, FieldMap } from '../event_schema';
import {
  EventLogServiceConfig,
  EventLogServiceDependencies,
  IEventLog,
  IEventLogDefinition,
  IEventLogResolver,
  IEventLogService,
  IScopedEventLogResolver,
} from './public_api';

import { EventLogRegistry } from './event_log_registry';
import { EventLogResolver } from './event_log_resolver';

const BOOTSTRAP_BY_DEFAULT = true;

interface ConstructorParams {
  config: EventLogServiceConfig;
  dependencies: EventLogServiceDependencies;
}

export class EventLogService implements IEventLogService {
  private readonly registry: EventLogRegistry;

  constructor(private readonly params: ConstructorParams) {
    this.registry = new EventLogRegistry();
  }

  public getResolver(bootstrapLog = BOOTSTRAP_BY_DEFAULT): IEventLogResolver {
    const { params, registry } = this;
    const { config, dependencies } = params;

    return new EventLogResolver(config, dependencies, registry, bootstrapLog);
  }

  public getScopedResolver(
    request: KibanaRequest,
    bootstrapLog = BOOTSTRAP_BY_DEFAULT
  ): IScopedEventLogResolver {
    const resolver = this.getResolver(bootstrapLog);

    return {
      resolve: async <TMap extends FieldMap>(
        definition: IEventLogDefinition<TMap>
      ): Promise<IEventLog<Event<TMap>>> => {
        const spaces = await this.params.dependencies.spacesService;
        const spaceId = spaces.getSpaceId(request);

        const log = await resolver.resolve(definition, spaceId);
        return log;
      },
    };
  }

  public async stop(): Promise<void> {
    await this.registry.shutdown();
  }
}
