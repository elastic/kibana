/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/data-stream-adapter';
import { DataStreamSpacesAdapter, type InstallParams } from '@kbn/data-stream-adapter';
import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ruleMigrationsFieldMap,
  ruleMigrationResourcesFieldMap,
} from './rule_migrations_field_maps';
import { RuleMigrationsDataClient } from './rule_migrations_data_client';

const TOTAL_FIELDS_LIMIT = 2500;
const DATA_STREAM_PREFIX = '.kibana-siem-rule-migrations';

interface CreateClientParams {
  spaceId: string;
  currentUser: AuthenticatedUser;
  esClient: ElasticsearchClient;
}

export class RuleMigrationsDataService {
  private readonly rulesDataStream: DataStreamSpacesAdapter;
  private readonly resourcesDataStream: DataStreamSpacesAdapter;

  constructor(private logger: Logger, private kibanaVersion: string) {
    this.rulesDataStream = this.createDataStream({
      name: `${DATA_STREAM_PREFIX}.rules`,
      fieldMap: ruleMigrationsFieldMap,
    });
    this.resourcesDataStream = this.createDataStream({
      name: `${DATA_STREAM_PREFIX}.resources`,
      fieldMap: ruleMigrationResourcesFieldMap,
    });
  }

  private createDataStream({ name, fieldMap }: { name: string; fieldMap: FieldMap }) {
    const dataStream = new DataStreamSpacesAdapter(name, {
      kibanaVersion: this.kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });
    dataStream.setComponentTemplate({ name, fieldMap });
    dataStream.setIndexTemplate({ name, componentTemplateRefs: [name] });
    return dataStream;
  }

  public install(params: Omit<InstallParams, 'logger'>) {
    Promise.all([
      this.rulesDataStream.install({ ...params, logger: this.logger }),
      this.resourcesDataStream.install({ ...params, logger: this.logger }),
    ]).catch((err) => {
      this.logger.error(`Error installing siem rule migrations data streams. ${err.message}`, err);
    });
  }

  public createClient({ spaceId, currentUser, esClient }: CreateClientParams) {
    // installSpace: creates the data stream for the specific space. it will only install if it hasn't been installed yet.
    // The adapter stores the data stream name promise, it will return it directly when the data stream is known to be installed.
    const indexNamePromises = {
      rules: this.rulesDataStream.installSpace(spaceId),
      resources: this.resourcesDataStream.installSpace(spaceId),
    };
    return new RuleMigrationsDataClient(
      indexNamePromises,
      currentUser.username,
      esClient,
      this.logger
    );
  }
}
