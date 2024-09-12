/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup } from '@elastic/eui';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import pLimit from 'p-limit';
import React from 'react';
import { Required } from 'utility-types';
import { parse, render } from 'mustache';
import { Entity, EntityTypeDefinition } from '../../../common/entities';
import { useKibana } from '../../hooks/use_kibana';
import { getDataStreamsForEntity } from '../../util/entities/get_data_streams_for_entity';
import { getEntitiesFromSource } from '../../util/entities/get_entities_from_source';
import { getEntitySourceDslFilter } from '../../util/entities/get_entity_source_dsl_filter';
import { EntityTable } from '../entity_table';

export function EntityRelationshipsView({
  entity,
  typeDefinition,
  allTypeDefinitions,
}: {
  entity: Entity;
  typeDefinition: Required<EntityTypeDefinition, 'discoveryDefinition'>;
  allTypeDefinitions: EntityTypeDefinition[];
}) {
  const {
    dependencies: {
      start: { data },
    },
    services: { inventoryAPIClient },
  } = useKibana();

  const entityDataStreamsFetch = useAbortableAsync(
    ({ signal }) => {
      return getDataStreamsForEntity({
        entity,
        inventoryAPIClient,
        signal,
        typeDefinition,
      });
    },
    [entity, typeDefinition, inventoryAPIClient]
  );

  const dataStreams = entityDataStreamsFetch.value?.dataStreams;

  const relationshipsFetch = useAbortableAsync(
    async ({ signal }): Promise<undefined | QueryDslQueryContainer[]> => {
      if (!dataStreams) {
        return undefined;
      }

      const entityFilter = getEntitySourceDslFilter({
        entity,
        identityFields: typeDefinition.discoveryDefinition.identityFields,
      });

      const allOtherDefinitions = allTypeDefinitions.filter((currentDefinition) => {
        return currentDefinition.discoveryDefinition?.id !== typeDefinition.discoveryDefinition?.id;
      });

      const limiter = pLimit(5);

      const allFilters = (
        await Promise.all(
          allOtherDefinitions.map((currentDefinition) => {
            return limiter(async () => {
              const entitiesForDefinition = await getEntitiesFromSource({
                dslFilter: entityFilter,
                indexPatterns: dataStreams.map((dataStream) => dataStream.name),
                data,
                definition: currentDefinition,
                signal,
              });

              const tpl = currentDefinition.discoveryDefinition?.displayNameTemplate!;
              parse(tpl);

              const entityQueries = entitiesForDefinition.flatMap((foundEntity) => {
                const index = foundEntity._index ?? '';
                const remote = index.includes(':') ? index.split(':')[0] + ':' : '';

                const displayName = render(tpl, { ...foundEntity, remote });
                return [
                  {
                    bool: {
                      filter: [
                        {
                          term: {
                            'entity.displayName.keyword': displayName,
                          },
                        },
                        { term: { 'entity.type': currentDefinition.discoveryDefinition?.type } },
                      ],
                    },
                  },
                ];
              });

              return entityQueries;
            });
          })
        )
      ).flat();

      return [
        {
          bool: {
            should: allFilters,
            minimum_should_match: 1,
          },
        },
      ];
    },
    [dataStreams, entity, typeDefinition, allTypeDefinitions, data]
  );

  const dslFilter = relationshipsFetch.value;

  return (
    <EuiFlexGroup direction="column">
      {dslFilter && dslFilter.length ? <EntityTable type="all" dslFilter={dslFilter} /> : null}
    </EuiFlexGroup>
  );
}
