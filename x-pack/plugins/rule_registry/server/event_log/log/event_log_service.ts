/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { SpacesServiceStart } from '../../../../spaces/server';

import { FieldMap } from '../event_schema';
import {
  EventLogServiceConfig,
  EventLogServiceDependencies,
  IEventLogDefinition,
  IEventLogProvider,
  IEventLogResolver,
  IEventLogService,
  IScopedEventLogResolver,
} from './public_api';

import { EventLogRegistry } from './event_log_registry';
import { EventLogResolver } from './event_log_resolver';

interface ConstructorParams {
  config: EventLogServiceConfig;
  dependencies: EventLogServiceDependencies;
}

export class EventLogService implements IEventLogService {
  private readonly registry: EventLogRegistry;
  private readonly resolver: EventLogResolver;
  private readonly spaces: SpacesServiceStart;

  constructor({ config, dependencies }: ConstructorParams) {
    this.registry = new EventLogRegistry();
    this.resolver = new EventLogResolver(config, dependencies, this.registry);
    this.spaces = dependencies.spaces;
  }

  public getResolver(): IEventLogResolver {
    return this.resolver;
  }

  public getScopedResolver(request: KibanaRequest): IScopedEventLogResolver {
    return {
      resolve: <TMap extends FieldMap>(
        definition: IEventLogDefinition<TMap>
      ): IEventLogProvider<TMap> => {
        const spaceId = this.spaces.getSpaceId(request);
        return this.resolver.resolve(definition, spaceId);
      },
    };
  }

  public async stop(): Promise<void> {
    await this.registry.close();
  }
}
