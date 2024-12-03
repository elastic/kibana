/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { EntityV2 } from '@kbn/entities-schema';
import { without } from 'lodash';
import {
  ReadSourceDefinitionOptions,
  readSourceDefinitions,
  storeSourceDefinition,
} from './definitions/source_definition';
import { readTypeDefinitions, storeTypeDefinition } from './definitions/type_definition';
import { getEntityInstancesQuery } from './queries';
import { mergeEntitiesList } from './queries/utils';
import {
  EntitySourceDefinition,
  EntityTypeDefinition,
  SearchByType,
  SearchBySources,
} from './types';
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

  async searchEntities({ type, ...options }: SearchByType) {
    const sources = await this.readSourceDefinitions({
      type,
    });

    if (sources.length === 0) {
      throw new UnknownEntityType(`No sources found for entity type [${type}]`);
    }

    return this.searchEntitiesBySources({
      sources,
      ...options,
    });
  }

  async searchEntitiesBySources({
    sources,
    metadata_fields: metadataFields,
    filters,
    start,
    end,
    sort,
    limit,
  }: SearchBySources) {
    const entities = await Promise.all(
      sources.map(async (source) => {
        const mandatoryFields = [
          ...source.identity_fields,
          ...(source.timestamp_field ? [source.timestamp_field] : []),
          ...(source.display_name ? [source.display_name] : []),
        ];
        const metaFields = [...metadataFields, ...source.metadata_fields];

        // operations on an unmapped field result in a failing query so we verify
        // field capabilities beforehand
        const { fields } = await this.options.clusterClient.asCurrentUser.fieldCaps({
          index: source.index_patterns,
          fields: [...mandatoryFields, ...metaFields],
        });

        const sourceHasMandatoryFields = mandatoryFields.every((field) => !!fields[field]);
        if (!sourceHasMandatoryFields) {
          // we can't build entities without id fields so we ignore the source.
          // TODO filters should likely behave similarly. we should also throw
          const missingFields = mandatoryFields.filter((field) => !fields[field]);
          this.options.logger.info(
            `Ignoring source for type [${source.type_id}] with index_patterns [${
              source.index_patterns
            }] because some mandatory fields [${missingFields.join(', ')}] are not mapped`
          );
          return [];
        }

        // but metadata field not being available is fine
        const availableMetadataFields = metaFields.filter((field) => fields[field]);
        if (availableMetadataFields.length < metaFields.length) {
          this.options.logger.info(
            `Ignoring unmapped fields [${without(metaFields, ...availableMetadataFields).join(
              ', '
            )}]`
          );
        }

        const query = getEntityInstancesQuery({
          source: {
            ...source,
            metadata_fields: availableMetadataFields,
            filters: [...source.filters, ...filters],
          },
          start,
          end,
          sort,
          limit,
        });
        this.options.logger.debug(`Entity query: ${query}`);

        const rawEntities = await runESQLQuery<EntityV2>('resolve entities', {
          query,
          esClient: this.options.clusterClient.asCurrentUser,
          logger: this.options.logger,
        });

        return rawEntities;
      })
    ).then((results) => results.flat());

    return mergeEntitiesList(sources, entities).slice(0, limit);
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
