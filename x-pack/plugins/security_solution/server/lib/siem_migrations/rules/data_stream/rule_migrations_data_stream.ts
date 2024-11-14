/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamSpacesAdapter, type InstallParams } from '@kbn/data-stream-adapter';
import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import { ruleMigrationsFieldMap } from './rule_migrations_field_map';
import { RuleMigrationsDataClient } from './rule_migrations_data_client';

const TOTAL_FIELDS_LIMIT = 2500;

const DATA_STREAM_NAME = '.kibana.siem-rule-migrations';

interface RuleMigrationsDataStreamCreateClientParams {
  spaceId: string;
  currentUser: AuthenticatedUser;
  esClient: ElasticsearchClient;
}

export class RuleMigrationsDataStream {
  private readonly dataStreamAdapter: DataStreamSpacesAdapter;
  private installPromise?: Promise<void>;

  constructor(private logger: Logger, kibanaVersion: string) {
    this.dataStreamAdapter = new DataStreamSpacesAdapter(DATA_STREAM_NAME, {
      kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });
    this.dataStreamAdapter.setComponentTemplate({
      name: DATA_STREAM_NAME,
      fieldMap: ruleMigrationsFieldMap,
    });

    this.dataStreamAdapter.setIndexTemplate({
      name: DATA_STREAM_NAME,
      componentTemplateRefs: [DATA_STREAM_NAME],
    });
  }

  async install(params: Omit<InstallParams, 'logger'>) {
    try {
      this.installPromise = this.dataStreamAdapter.install({ ...params, logger: this.logger });
      await this.installPromise;
    } catch (err) {
      this.logger.error(`Error installing siem rule migrations data stream. ${err.message}`, err);
    }
  }

  createClient({
    spaceId,
    currentUser,
    esClient,
  }: RuleMigrationsDataStreamCreateClientParams): RuleMigrationsDataClient {
    const dataStreamNamePromise = this.installSpace(spaceId);
    return new RuleMigrationsDataClient(dataStreamNamePromise, currentUser, esClient, this.logger);
  }

  // Installs the data stream for the specific space. it will only install if it hasn't been installed yet.
  // The adapter stores the data stream name promise, it will return it directly when the data stream is known to be installed.
  private async installSpace(spaceId: string): Promise<string> {
    if (!this.installPromise) {
      throw new Error('Siem rule migrations data stream not installed');
    }
    // wait for install to complete, may reject if install failed, routes should handle this
    await this.installPromise;
    let dataStreamName = await this.dataStreamAdapter.getInstalledSpaceName(spaceId);
    if (!dataStreamName) {
      dataStreamName = await this.dataStreamAdapter.installSpace(spaceId);
    }
    return dataStreamName;
  }
}
