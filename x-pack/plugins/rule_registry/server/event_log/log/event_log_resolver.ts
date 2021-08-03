/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndexBootstrapper,
  IndexManagementGateway,
  IndexNames,
  IndexReader,
  IndexSpecification,
  IndexWriter,
} from '../elasticsearch';

import { Event, FieldMap } from '../event_schema';
import { IEventLogRegistry, IEventLogProvider } from './internal_api';
import {
  EventLogServiceConfig,
  EventLogServiceDependencies,
  IEventLog,
  IEventLogDefinition,
  IEventLogResolver,
} from './public_api';

import { EventLog } from './event_log';
import { EventLogBootstrapper } from './event_log_bootstrapper';
import { EventLogProvider } from './event_log_provider';
import { mappingFromFieldMap } from './utils/mapping_from_field_map';

export class EventLogResolver implements IEventLogResolver {
  private readonly indexBootstrapper: IndexBootstrapper;

  constructor(
    private readonly config: EventLogServiceConfig,
    private readonly deps: EventLogServiceDependencies,
    private readonly registry: IEventLogRegistry,
    private readonly bootstrapLog: boolean
  ) {
    this.indexBootstrapper = this.createIndexBootstrapper();
  }

  public async resolve<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    kibanaSpaceId: string
  ): Promise<IEventLog<Event<TMap>>> {
    const provider = this.resolveLogProvider(definition, kibanaSpaceId);

    if (this.bootstrapLog) {
      await provider.bootstrapLog();
    }

    return provider.getLog();
  }

  private resolveLogProvider<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    kibanaSpaceId: string
  ): IEventLogProvider<Event<TMap>> {
    const existingProvider = this.registry.get(definition, kibanaSpaceId);
    if (existingProvider) {
      return existingProvider;
    }

    const indexSpec = this.createIndexSpec(definition, kibanaSpaceId);
    const indexReader = this.createIndexReader(indexSpec);
    const indexWriter = this.createIndexWriter(indexSpec);
    const logBootstrapper = this.createEventLogBootstrapper(indexSpec);
    const log = this.createEventLog<TMap>(indexSpec, indexReader, indexWriter);
    const logProvider = new EventLogProvider({
      log,
      logBootstrapper,
      indexWriter,
    });

    this.registry.add(definition, kibanaSpaceId, logProvider);

    return logProvider;
  }

  private createIndexSpec<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    kibanaSpaceId: string
  ): IndexSpecification {
    const { indexPrefix } = this.config;
    const { eventLogName, eventSchema, ilmPolicy } = definition;

    const indexNames = IndexNames.create({
      indexPrefix,
      logName: eventLogName,
      kibanaSpaceId,
    });

    const indexMappings = mappingFromFieldMap(eventSchema.objectFields, 'strict');

    return { indexNames, indexMappings, ilmPolicy };
  }

  private createIndexBootstrapper(): IndexBootstrapper {
    const { clusterClient, logger } = this.deps;

    return new IndexBootstrapper({
      gateway: new IndexManagementGateway({
        elasticsearch: clusterClient.then((c) => c.asInternalUser),
        logger,
      }),
      logger,
    });
  }

  private createIndexReader(indexSpec: IndexSpecification): IndexReader {
    const { clusterClient, logger } = this.deps;
    const { indexNames } = indexSpec;

    return new IndexReader({
      indexName: indexNames.indexAliasPattern,
      elasticsearch: clusterClient.then((c) => c.asInternalUser), // TODO: internal or current?
      logger,
    });
  }

  private createIndexWriter(indexSpec: IndexSpecification): IndexWriter {
    const { clusterClient, logger } = this.deps;
    const { isWriteEnabled } = this.config;
    const { indexNames } = indexSpec;

    return new IndexWriter({
      indexName: indexNames.indexAliasName,
      elasticsearch: clusterClient.then((c) => c.asInternalUser), // TODO: internal or current?
      isWriteEnabled,
      logger,
    });
  }

  private createEventLogBootstrapper(indexSpec: IndexSpecification): EventLogBootstrapper {
    const { logger } = this.deps;
    const { isWriteEnabled } = this.config;

    return new EventLogBootstrapper({
      indexSpec,
      indexBootstrapper: this.indexBootstrapper,
      isWriteEnabled,
      logger,
    });
  }

  private createEventLog<TMap extends FieldMap>(
    indexSpec: IndexSpecification,
    indexReader: IndexReader,
    indexWriter: IndexWriter
  ): IEventLog<Event<TMap>> {
    const { logger } = this.deps;

    return new EventLog<Event<TMap>>({
      indexNames: indexSpec.indexNames,
      indexReader,
      indexWriter,
      logger,
    });
  }
}
