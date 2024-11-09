/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import { IndexPatternAdapter, type FieldMap, type InstallParams } from '@kbn/index-adapter';
import {
  ruleMigrationsFieldMap,
  ruleMigrationResourcesFieldMap,
} from './rule_migrations_field_maps';
import { RuleMigrationsDataClient } from './rule_migrations_data_client';

const TOTAL_FIELDS_LIMIT = 2500;
const INDEX_PATTERN = '.kibana-siem-rule-migrations';

export type AdapterId = 'rules' | 'resources';

interface CreateClientParams {
  spaceId: string;
  currentUser: AuthenticatedUser;
  esClient: ElasticsearchClient;
}

export class RuleMigrationsDataService {
  private readonly adapters: Record<AdapterId, IndexPatternAdapter>;

  constructor(private logger: Logger, private kibanaVersion: string) {
    this.adapters = {
      rules: this.createAdapter({ id: 'rules', fieldMap: ruleMigrationsFieldMap }),
      resources: this.createAdapter({ id: 'resources', fieldMap: ruleMigrationResourcesFieldMap }),
    };
  }

  private createAdapter({ id, fieldMap }: { id: AdapterId; fieldMap: FieldMap }) {
    const name = `${INDEX_PATTERN}-${id}`;
    const adapter = new IndexPatternAdapter(name, {
      kibanaVersion: this.kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });
    adapter.setComponentTemplate({ name, fieldMap });
    adapter.setIndexTemplate({ name, componentTemplateRefs: [name] });
    return adapter;
  }

  public install(params: Omit<InstallParams, 'logger'>) {
    Promise.all([
      this.adapters.rules.install({ ...params, logger: this.logger }),
      this.adapters.resources.install({ ...params, logger: this.logger }),
    ]).catch((err) => {
      this.logger.error(`Error installing siem rule migrations index. ${err.message}`, err);
    });
  }

  public createClient({ spaceId, currentUser, esClient }: CreateClientParams) {
    const indexNameProviders = {
      rules: this.createIndexNameProvider('rules', spaceId),
      resources: this.createIndexNameProvider('resources', spaceId),
    };

    return new RuleMigrationsDataClient(
      indexNameProviders,
      currentUser.username,
      esClient,
      this.logger
    );
  }

  private createIndexNameProvider(adapter: AdapterId, spaceId: string) {
    return async (migrationId: string) => {
      const suffix = `${migrationId}-${spaceId}`;
      if (suffix.includes('*')) {
        return this.adapters[adapter].getIndexName(suffix);
      }
      return this.adapters[adapter].createIndex(suffix);
    };
  }
}
