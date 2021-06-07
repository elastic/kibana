/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, EventLogDefinition, IndexNames } from '../common';
import {
  IndexBootstrapper,
  IndexManagementGateway,
  IndexReader,
  IndexWriter,
  IndexSpec,
  createIndexSpec,
} from '../elasticsearch';

import {
  BootstrapperOfCommonResources,
  BootstrappingResult,
} from './bootstrapper_of_common_resources';
import { BootstrapperOfLogResources } from './bootstrapper_of_log_resources';
import { EventLog } from './event_log';
import { IEventLog, EventLogServiceConfig, EventLogServiceDependencies } from './public_api';

export class EventLogObjectFactory {
  constructor(
    private readonly config: EventLogServiceConfig,
    private readonly deps: EventLogServiceDependencies
  ) {}

  public createIndexSpec(logDefinition: EventLogDefinition<any>, kibanaSpaceId: string): IndexSpec {
    const { indexPrefix } = this.config;
    return createIndexSpec(logDefinition, indexPrefix, kibanaSpaceId);
  }

  public createIndexReader(indexSpec: IndexSpec): IndexReader {
    const { clusterClient, logger } = this.deps;
    const { indexNames } = indexSpec;

    return new IndexReader({
      indexName: indexNames.indexAliasPattern,
      elasticsearch: clusterClient.then((c) => c.asInternalUser),
      logger,
    });
  }

  public createIndexWriter(indexSpec: IndexSpec): IndexWriter {
    const { clusterClient, logger } = this.deps;
    const { isWriteEnabled } = this.config;
    const { indexNames } = indexSpec;

    return new IndexWriter({
      indexName: indexNames.indexAliasName,
      elasticsearch: clusterClient.then((c) => c.asInternalUser),
      isWriteEnabled,
      logger,
    });
  }

  public createIndexBootstrapper(): IndexBootstrapper {
    const { clusterClient, logger } = this.deps;

    return new IndexBootstrapper({
      gateway: new IndexManagementGateway({
        elasticsearch: clusterClient.then((c) => c.asInternalUser),
        logger,
      }),
      logger,
    });
  }

  public createBootstrapperOfCommonResources(): BootstrapperOfCommonResources {
    const { logger } = this.deps;
    const { indexPrefix, isWriteEnabled } = this.config;

    return new BootstrapperOfCommonResources({
      indexNames: IndexNames.create({
        indexPrefix,
        logName: 'stub',
        kibanaSpaceId: 'stub',
      }),
      indexBootstrapper: this.createIndexBootstrapper(),
      isWriteEnabled,
      logger,
    });
  }

  public createBootstrapperOfLogResources(
    indexSpec: IndexSpec,
    isMechanismReady: Promise<BootstrappingResult>
  ): BootstrapperOfLogResources {
    const { logger } = this.deps;
    const { isWriteEnabled } = this.config;

    return new BootstrapperOfLogResources({
      indexSpec,
      indexBootstrapper: this.createIndexBootstrapper(),
      isWriteEnabled,
      isMechanismReady,
      logger,
    });
  }

  public createEventLog<TEvent extends CommonFields>(
    indexSpec: IndexSpec,
    indexReader: IndexReader,
    indexWriter: IndexWriter
  ): IEventLog<TEvent> {
    const { logger } = this.deps;

    return new EventLog<TEvent>({
      indexNames: indexSpec.indexNames,
      indexReader,
      indexWriter,
      logger,
    });
  }
}
