/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsCompositeBucket } from '@elastic/elasticsearch/lib/api/types';
import { CoreStart, Logger } from '@kbn/core/server';
import { EntityLatestDoc } from '@kbn/entities-schema';
import { unflattenObject } from '@kbn/observability-utils-common/object/unflatten_object';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { debounce, uniq } from 'lodash';
import { render } from 'mustache';
import pLimit from 'p-limit';
import { LATEST_ENTITIES_INDEX } from '../../../common/entities';
import { serializeLink } from '../../../common/links';
import { getEntityById } from '../../routes/entities/get_entity_by_id';
import { InventoryStartDependencies } from '../../types';

interface RuleCreateOperation {
  create: {
    rule: {
      id: string;
      type: string;
    };
  };
}

interface RuleDeleteOperation {
  delete: {
    rule: {
      id: string;
    };
  };
}

type RuleOperation = RuleCreateOperation | RuleDeleteOperation;

export function startAssociateRulesWithEntities({
  coreStart,
  plugins,
  logger,
}: {
  coreStart: CoreStart;
  plugins: Pick<InventoryStartDependencies, 'alerting' | 'entityManager'>;
  logger: Logger;
}) {
  const operations: RuleOperation[] = [];

  const scheduleSync = debounce(() => {
    processOperations().catch((error) => {
      logger.error(error);
    });
  }, 250);

  plugins.alerting.events.onRuleUpdate$.subscribe((rule) => {
    operations.push({ create: { rule } });
    scheduleSync();
  });

  plugins.alerting.events.onRuleCreate$.subscribe((rule) => {
    operations.push({ create: { rule } });
    scheduleSync();
  });

  plugins.alerting.events.onRuleDelete$.subscribe((rule) => {
    operations.push({ delete: { rule } });
    scheduleSync();
  });

  const ruleTypesByTypeId = new Map(
    Array.from(plugins.alerting.listTypes().values()).map((type) => [type.id, type])
  );

  async function processOperations() {
    let nextOperation: RuleOperation;

    const request = await plugins.entityManager.getFakeRequestForBackgroundUser();

    if (!request) {
      return;
    }

    const [entityClient, rulesClient] = await Promise.all([
      plugins.entityManager.getScopedClient({ request }),
      plugins.alerting.getRulesClientWithRequest(request),
    ]);

    const esClient = coreStart.elasticsearch.client.asScoped(request);

    const inventoryEsClient = createObservabilityEsClient({
      client: esClient.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const { definitions: allTypeDefinitions } = await entityClient.getEntityDefinitions({
      perPage: 10_000,
    });

    const typeDefinitionByType = new Map(
      allTypeDefinitions.map((definition) => [definition.type, definition])
    );
    async function linkRuleIfAppropriate({ id }: { id: string }) {
      const rule = await rulesClient.get({ id });

      const ruleType = ruleTypesByTypeId.get(rule.alertTypeId)!;

      const dataScope = ruleType.getDataScope?.(rule.params);
      if (dataScope && !dataScope.groupingFields?.length) {
        const response = await esClient.asCurrentUser.search({
          size: 0,
          track_total_hits: false,
          index: dataScope.index,
          query: {
            bool: {
              filter: [
                dataScope.query,
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-24h',
                      lte: 'now',
                    },
                  },
                },
                {
                  bool: {
                    must_not: [
                      {
                        terms: {
                          _tier: ['data_frozen'],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          aggs: Object.fromEntries(
            allTypeDefinitions.map((definition) => {
              return [
                definition.type,
                {
                  composite: {
                    sources: definition.identityFields.map((identityField) => {
                      return {
                        [identityField.field]: {
                          terms: {
                            field: identityField.field,
                            missing_bucket: identityField.optional,
                          },
                        },
                      };
                    }),
                    size: 2,
                  },
                },
              ];
            })
          ),
        });

        for (const [type, aggregate] of Object.entries(response.aggregations ?? {})) {
          const aggregateTyped = aggregate as { buckets: AggregationsCompositeBucket[] };

          if (aggregateTyped.buckets.length === 1) {
            const definition = typeDefinitionByType.get(type)!;

            const bucket = aggregateTyped.buckets[0];

            const properties = unflattenObject(
              Object.fromEntries(
                definition.identityFields.map(({ field }) => {
                  return [field, bucket.key[field] as string | number | null | boolean];
                })
              )
            );

            const displayName = render(definition.displayNameTemplate, properties);

            const entity = await getEntityById({
              type,
              displayName,
              esClient: inventoryEsClient,
            });

            if (entity) {
              logger.info(
                `Automatically association rule ${id} with the ${definition.type} ${entity.displayName}`
              );

              await entityClient.updateEntity({
                definitionId: definition.id,
                id: entity._source.entity.id,
                doc: {
                  ...entity._source,
                  entity: {
                    ...entity._source.entity,
                    links: uniq(
                      (entity._source.entity.links ?? []).concat(
                        serializeLink({
                          type: 'asset',
                          asset: {
                            type: 'rule',
                            id,
                          },
                        })
                      )
                    ),
                  },
                },
              });
            }
          }
        }
      }
    }

    async function deleteRuleLinks(ruleId: string) {
      const serializedLink = serializeLink({
        type: 'asset',
        asset: {
          type: 'rule',
          id: ruleId,
        },
      });

      const entitiesWithLinksToRuleResponse = await inventoryEsClient.search(
        'find_entities_with_links_for_rule_id',
        {
          index: LATEST_ENTITIES_INDEX,
          size: 10_000,
          track_total_hits: true,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    'entity.links': serializedLink,
                  },
                },
              ],
            },
          },
        }
      );

      const entitiesWithLinks = entitiesWithLinksToRuleResponse.hits.hits.map(
        (hit) => hit._source as Pick<EntityLatestDoc, 'entity' | 'event'>
      );

      const limiter = pLimit(5);

      await Promise.all(
        entitiesWithLinks.map((entity) => {
          const definition = typeDefinitionByType.get(entity.entity.type);
          if (!definition) {
            return;
          }
          return limiter(async () => {
            return entityClient.updateEntity({
              definitionId: definition.id,
              doc: {
                ...entity,
                entity: {
                  ...entity.entity,
                  links: entity.entity.links?.filter((link) => link === serializedLink),
                },
              },
              id: entity.entity.id,
            });
          });
        })
      );
    }

    while (operations.length) {
      nextOperation = operations.shift()!;
      if ('create' in nextOperation) {
        await linkRuleIfAppropriate(nextOperation.create.rule);
      } else if ('delete' in nextOperation) {
        await deleteRuleLinks(nextOperation.delete.rule.id);
      }
    }
  }
}
