/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';

import { CommonFields, EventLogDefinition } from '../common';
import {
  EventLogServiceConfig,
  EventLogServiceDependencies,
  IEventLog,
  IEventLogResolver,
  IEventLogService,
  IScopedEventLogResolver,
} from './public_api';

import { EventLogObjectFactory } from './event_log_object_factory';
import { EventLogRegistry } from './event_log_registry';
import { EventLogResolver } from './event_log_resolver';
import { BootstrapperOfCommonResources } from './bootstrapper_of_common_resources';

const BOOTSTRAP_BY_DEFAULT = true;

interface ConstructorParams {
  config: EventLogServiceConfig;
  dependencies: EventLogServiceDependencies;
}

export class EventLogService implements IEventLogService {
  private readonly factory: EventLogObjectFactory;
  private readonly registry: EventLogRegistry;
  private readonly bootstrapper: BootstrapperOfCommonResources;

  constructor(private readonly params: ConstructorParams) {
    this.factory = new EventLogObjectFactory(params.config, params.dependencies);
    this.registry = new EventLogRegistry();
    this.bootstrapper = this.factory.createBootstrapperOfCommonResources();
  }

  public getResolver(bootstrapLog = BOOTSTRAP_BY_DEFAULT): IEventLogResolver {
    const isMechanismReady = this.bootstrapper.waitUntilFinished();
    return new EventLogResolver(this.factory, this.registry, isMechanismReady, bootstrapLog);
  }

  public getScopedResolver(
    request: KibanaRequest,
    bootstrapLog = BOOTSTRAP_BY_DEFAULT
  ): IScopedEventLogResolver {
    const resolver = this.getResolver(bootstrapLog);

    return {
      resolve: async <TEvent extends CommonFields>(
        logDefinition: EventLogDefinition<TEvent>
      ): Promise<IEventLog<TEvent>> => {
        const spaces = await this.params.dependencies.spacesService;
        const spaceId = spaces.getSpaceId(request);

        const log = await resolver.resolve(logDefinition, spaceId);
        return log;
      },
    };
  }

  public start(): void {
    this.bootstrapper.start();
  }

  public async stop(): Promise<void> {
    await this.bootstrapper.waitUntilFinished();
    await this.registry.shutdown();
  }
}
