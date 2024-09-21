/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger, SavedObject, SavedObjectReference } from '@kbn/core/server';
import type { DashboardAttributes, SavedDashboardPanel } from '@kbn/dashboard-plugin/common';
import { Filter, Query, buildEsQuery } from '@kbn/es-query';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { SerializedVis } from '@kbn/visualizations-plugin/common';
import { chunk, isEmpty, pick } from 'lodash';
import objectHash from 'object-hash';
import pLimit from 'p-limit';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import type { Entity, IdentityField } from '../../../common/entities';
import { getEntitySourceDslFilter } from '../../../common/utils/get_entity_source_dsl_filter';
import { withInventorySpan } from '../../lib/with_inventory_span';

export interface DashboardWithEntityDataCheck {
  id: string;
  title: string;
  panels: Array<{ id?: string; title?: string; check: 'has_data' | 'has_no_data' | 'unknown' }>;
}

export async function checkDashboardsForEntityData({
  esClient,
  dashboards,
  logger,
  entity,
  identityFields,
  start,
  end,
}: {
  esClient: ObservabilityElasticsearchClient;
  dashboards: Array<SavedObject<DashboardAttributes>>;
  logger: Logger;
  entity: Entity;
  identityFields: IdentityField[];
  start: number;
  end: number;
}): Promise<DashboardWithEntityDataCheck[]> {
  return withInventorySpan(
    'check_dashboards_for_entity_data',
    async () => {
      const dashboardsWithRequests = dashboards.map((so) => {
        const attrs = so.attributes as DashboardAttributes;

        const referencedIndexPatterns = Object.fromEntries(
          so.references
            .filter((ref) => ref.type === 'index-pattern')
            .map((ref) => [ref.name, ref.id])
        );

        const topLevelSearchSource = JSON.parse(
          attrs.kibanaSavedObjectMeta.searchSourceJSON
        ) as SearchSource;

        const panels: SavedDashboardPanel[] = JSON.parse(attrs.panelsJSON);

        const panelRequests = panels.map((panel) => {
          const request = getRequestForPanel({
            panel,
            logger,
            referencedIndexPatterns,
          });

          const query = request ? withSearchSource(request.query, topLevelSearchSource) : undefined;

          const requestWithSearchSource =
            request && query
              ? {
                  ...request,
                  query,
                }
              : undefined;

          return {
            panel: {
              id: panel.id,
              title: panel.title,
            },
            ...(requestWithSearchSource
              ? { request: { ...requestWithSearchSource, id: objectHash(requestWithSearchSource) } }
              : {}),
          };
        });

        return {
          id: so.id,
          title: so.attributes.title,
          panelRequests,
        };
      });

      const allPanelRequests = dashboardsWithRequests.flatMap((dashboard) =>
        dashboard.panelRequests.flatMap((request) => (request.request ? [request.request] : []))
      );

      const deduplicatedRequests = Array.from(
        new Map(
          allPanelRequests.map((request) => [
            request.id,
            { id: request.id, query: request.query, index: request.indexPatterns },
          ])
        ).values()
      );

      const limiter = pLimit(5);

      logger.debug(`Running ${deduplicatedRequests.length} requests`);

      const requestChunks = chunk(deduplicatedRequests, 50);

      const responses = await withInventorySpan(
        'run_all_scope_requests',
        () =>
          Promise.all(
            requestChunks.map((requestsForChunk) => {
              return limiter(async () => {
                const searches = requestsForChunk.flatMap(({ query, index }) => {
                  return [
                    {
                      index,
                    },
                    {
                      terminate_after: 1,
                      timeout: '1ms',
                      track_total_hits: 1,
                      size: 0,
                      query: {
                        bool: {
                          filter: [
                            query,
                            ...excludeFrozenQuery(),
                            ...rangeQuery(start, end),
                            ...getEntitySourceDslFilter({
                              entity,
                              identityFields,
                            }),
                          ],
                        },
                      },
                    },
                  ];
                });

                const allResponses = await esClient.msearch('check_queries_for_data', {
                  searches,
                });

                return requestsForChunk.map((request, index) => {
                  const response = allResponses.responses[index];
                  const total =
                    typeof response.hits.total === 'number'
                      ? response.hits.total
                      : response.hits.total?.value ?? 0;

                  return {
                    ...request,
                    has_data: total > 0,
                  };
                });
              });
            })
          ),
        logger
      );

      const resultsByRequestId = new Map(
        responses.flat().map((response) => [response.id, response.has_data])
      );

      return dashboardsWithRequests.map((dashboard) => {
        return {
          id: dashboard.id,
          title: dashboard.title,
          panels: dashboard.panelRequests.map(({ panel: { id, title }, request }) => {
            const requestId = request?.id;
            const hasDataBool = requestId ? resultsByRequestId.get(requestId) : undefined;
            let hasDataEnum: 'has_data' | 'has_no_data' | 'unknown';
            if (hasDataBool === true) {
              hasDataEnum = 'has_data';
            } else if (hasDataBool === false) {
              hasDataEnum = 'has_no_data';
            } else {
              hasDataEnum = 'unknown';
            }

            return {
              id,
              title,
              check: hasDataEnum,
            };
          }),
        };
      });
    },
    logger
  );
}

interface SearchSource {
  filter?: Filter;
  indexRefName?: string;
  query: Query;
}

function withSearchSource(
  query?: QueryDslQueryContainer,
  searchSource?: SearchSource
): QueryDslQueryContainer | undefined {
  const searchSourceQuery = buildEsQuery(
    undefined,
    searchSource?.query ?? [],
    searchSource?.filter ?? []
  );

  if (
    isEmpty(searchSourceQuery.bool?.filter) &&
    isEmpty(searchSourceQuery.bool?.must) &&
    isEmpty(searchSourceQuery.bool?.should)
  ) {
    return query;
  }

  if (!query) {
    return searchSourceQuery;
  }

  return {
    bool: {
      filter: [query, searchSourceQuery],
    },
  };
}

function getIndexPatternsFromReferences(
  references: SavedObjectReference[],
  logger: Logger
): string[] {
  return references.flatMap((reference) => {
    if (reference.type !== 'index-pattern') {
      logger.debug(() => `Found unknown reference type: ${reference.type}`);
      return [];
    }
    return reference.id;
  });
}

function getRequestForPanel({
  panel,
  referencedIndexPatterns,
  logger,
}: {
  panel: SavedDashboardPanel;
  referencedIndexPatterns: Record<string, string>;
  logger: Logger;
}):
  | {
      ignoreGlobalFilter?: boolean;
      query: QueryDslQueryContainer;
      indexPatterns: string[];
    }
  | undefined {
  const config = panel.embeddableConfig;

  switch (panel.type) {
    case 'lens': {
      const lensConfig = config.attributes as unknown as LensAttributes;
      const indexPatternsForPanel = getIndexPatternsFromReferences(lensConfig.references, logger);

      const esQuery = buildEsQuery(undefined, lensConfig.state.query, lensConfig.state.filters);

      const formBasedLayers = Object.values(
        lensConfig.state.datasourceStates.formBased?.layers ?? {}
      );
      const textBasedLayers = Object.values(
        lensConfig.state.datasourceStates.textBased?.layers ?? {}
      );

      if (!formBasedLayers.length || !textBasedLayers.length) {
        return {
          query: esQuery,
          indexPatterns: indexPatternsForPanel,
        };
      }

      const allShoulds: QueryDslQueryContainer[] = [];

      formBasedLayers.forEach((layer) => {
        const shoulds: QueryDslQueryContainer[] = [];
        const columns = Object.values(layer.columns ?? {});

        columns.forEach((column) => {
          const filter = column.filter;
          if (filter) {
            shoulds.push(buildEsQuery(undefined, filter, []));
          } else {
            shoulds.push({
              match_all: {},
            });
          }
        });

        if (layer.ignoreGlobalFilters) {
          return;
        }

        allShoulds.push(...shoulds);
      });

      textBasedLayers.forEach((layer) => {
        // TODO: figure out if this impacts the query
      });

      // if there are some match_all queries, it's essentially a no-op
      if (allShoulds.length && allShoulds.some((should) => !('match_all' in should))) {
        return {
          query: {
            bool: {
              filter: [esQuery],
              should: allShoulds,
              minimum_should_match: 1,
            },
          },
          indexPatterns: indexPatternsForPanel,
        };
      }

      return {
        query: esQuery,
        indexPatterns: indexPatternsForPanel,
      };
    }

    case 'visualization': {
      const vizConfig = config.savedVis as unknown as SerializedVis;

      if (vizConfig.type === 'markdown') {
        return undefined;
      }

      if (vizConfig.type === 'metrics') {
        const indexPatternRefName = vizConfig.params.index_pattern_ref_name as string | undefined;
        if (indexPatternRefName) {
          const indexPattern = referencedIndexPatterns[indexPatternRefName];
          if (!indexPattern) {
            logger.warn(`Could not find index pattern by reference ${indexPatternRefName}`);
            return undefined;
          }
          return {
            indexPatterns: [indexPattern],
            query: {
              match_all: {},
            },
          };
        }
      } else if (vizConfig.type !== 'markdown') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        logger.debug(() => require('util').inspect(config, { depth: null }));
      }

      return undefined;
    }

    case 'search': {
      const searchConfig = config.attributes as unknown as SavedSearch;

      const searchSource = JSON.parse(
        searchConfig.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'
      ) as SearchSource;

      const indexPatternsForPanel = getIndexPatternsFromReferences(
        searchConfig.references ?? [],
        logger
      );

      return {
        ...pick(panel, 'id', 'title'),
        indexPatterns: indexPatternsForPanel,
        query: buildEsQuery(undefined, searchSource.query, searchSource.filter ?? []),
      };
    }

    default:
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      logger.debug(() => require('util').inspect(config, { depth: null }));
      return undefined;
  }
}
