/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { EntityV2 } from '@kbn/entities-schema';
import {
  ReadSourceDefinitionOptions,
  readSourceDefinitions,
  storeSourceDefinition,
} from './definitions/source_definition';
import { readTypeDefinitions, storeTypeDefinition } from './definitions/type_definition';
import { getEntityInstancesQuery } from './queries';
import { mergeEntitiesList } from './queries/utils';
import { EntitySourceDefinition, EntityTypeDefinition } from './types';
import { UnknownEntityType } from './errors/unknown_entity_type';
import { runESQLQuery } from './run_esql_query';

export class EntityClient {
  constructor(
    private options: {
      clusterClient: IScopedClusterClient;
      soClient: SavedObjectsClientContract;
      logger: Logger;
    }
  ) {}

  async searchEntities({
    type,
    start,
    end,
    metadataFields = [],
    filters = [],
    limit = 10,
  }: {
    type: string;
    start: string;
    end: string;
    metadataFields?: string[];
    filters?: string[];
    limit?: number;
  }) {
    const sources = await this.readSourceDefinitions({ type });

    if (sources.length === 0) {
      throw new UnknownEntityType(`No sources found for entity type [${type}]`);
    }

    return this.searchEntitiesBySources({
      sources,
      start,
      end,
      metadataFields,
      filters,
      limit,
    });
  }

  async searchEntitiesBySources({
    sources,
    start,
    end,
    metadataFields = [],
    filters = [],
    limit = 10,
  }: {
    sources: EntitySourceDefinition[];
    start: string;
    end: string;
    metadataFields?: string[];
    filters?: string[];
    limit?: number;
  }) {
    const entities = await Promise.all(
      sources.map(async (source) => {
        const mandatoryFields = [source.timestamp_field, ...source.identity_fields];
        const metaFields = [...metadataFields, ...source.metadata_fields];
        const { fields } = await this.options.clusterClient.asCurrentUser.fieldCaps({
          index: source.index_patterns,
          fields: [...mandatoryFields, ...metaFields],
        });

        const sourceHasMandatoryFields = mandatoryFields.every((field) => !!fields[field]);
        if (!sourceHasMandatoryFields) {
          // we can't build entities without id fields so we ignore the source.
          // filters should likely behave similarly.
          this.options.logger.info(
            `Ignoring source for type [${source.type_id}] with index_patterns [${source.index_patterns}] because some mandatory fields [${mandatoryFields}] are not mapped`
          );
          return [];
        }

        // but metadata field not being available is fine
        const availableMetadataFields = metaFields.filter((field) => fields[field]);

        const query = getEntityInstancesQuery({
          source: {
            ...source,
            metadata_fields: availableMetadataFields,
            filters: [...source.filters, ...filters],
          },
          start,
          end,
          limit,
        });
        this.options.logger.debug(`Entity query: ${query}`);

        const rawEntities = await runESQLQuery<EntityV2>('resolve entities', {
          query,
          esClient: this.options.clusterClient.asCurrentUser,
          logger: this.options.logger,
        });

        return rawEntities.map((entity) => {
          entity['entity.id'] = source.identity_fields.map((field) => entity[field]).join(':');
          entity['entity.type'] = source.type_id;
          return entity;
        });
      })
    ).then((results) => results.flat());

    return mergeEntitiesList(entities).slice(0, limit);
  }

  async storeTypeDefinition(type: EntityTypeDefinition) {
    return storeTypeDefinition(type, this.options.clusterClient, this.options.logger);
  }

  async readTypeDefinitions() {
    return readTypeDefinitions(this.options.clusterClient, this.options.logger);
  }

  async storeSourceDefinition(source: EntitySourceDefinition) {
    return storeSourceDefinition(source, this.options.clusterClient, this.options.logger);
  }

  async readSourceDefinitions(options?: ReadSourceDefinitionOptions) {
    return readSourceDefinitions(this.options.clusterClient, this.options.logger, options);
  }
}
