/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { groupBy } from 'lodash';
import React from 'react';
import { Entity } from '../../../common/entities';
import { useKibana } from '../../hooks/use_kibana';
import { EntityTable } from '../entity_table';

export function EntityRelationshipsView({
  entity,
  dataStreams,
}: {
  entity: Entity;
  dataStreams: Array<{ name: string }>;
}) {
  const {
    dependencies: {
      start: { data },
    },
    services: { inventoryAPIClient },
  } = useKibana();

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const relationshipQueryFetch = useAbortableAsync(
    async ({ signal }) => {
      if (!dataStreams) {
        return undefined;
      }

      const queries = await inventoryAPIClient
        .fetch('POST /internal/inventory/entity/relationships', {
          signal,
          params: {
            body: {
              type: entity.type,
              displayName: entity.displayName,
              start,
              end,
              indexPatterns: dataStreams.map((dataStream) => dataStream.name),
            },
          },
        })
        .then((response) => {
          const relationshipsByType = groupBy(
            response.relatedEntities,
            (relatedEntity) => relatedEntity.type
          );

          return Object.entries(relationshipsByType).map(([type, entities]) => {
            return {
              bool: {
                filter: [
                  {
                    term: {
                      'entity.type': type,
                    },
                  },
                  {
                    terms: {
                      ['entity.displayName.keyword']: entities.map(
                        (relatedEntity) => relatedEntity.displayName
                      ),
                    },
                  },
                ],
              },
            };
          });
        });

      if (!queries.length) {
        return [
          {
            bool: {
              must_not: {
                match_all: {},
              },
            },
          },
        ];
      }

      return [
        {
          bool: {
            should: queries,
            minimum_should_match: 1,
          },
        },
      ];
    },
    [dataStreams, entity, inventoryAPIClient, start, end]
  );

  const dslFilter = relationshipQueryFetch.value;

  return (
    <EuiFlexGroup direction="column">
      {dslFilter && dslFilter.length ? <EntityTable type="all" dslFilter={dslFilter} /> : null}
    </EuiFlexGroup>
  );
}
