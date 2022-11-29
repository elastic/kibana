/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNumber } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { ElasticsearchClient, Logger, KibanaRequest } from '@kbn/core/server';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SpacesServiceStart } from '@kbn/spaces-plugin/server';

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { DESTINATION_INDEX } from './install_transform';

const optionalDateFieldSchema = schema.maybe(
  schema.string({
    validate(value) {
      if (isNaN(Date.parse(value))) {
        return 'Invalid Date';
      }
    },
  })
);

const sortSchema = schema.object({
  sort_field: schema.string(),
  sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
});

export const GetByRuleIdsOptionsSchema = schema.object({
  per_page: schema.number({ defaultValue: 10, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  start: optionalDateFieldSchema,
  end: optionalDateFieldSchema,
  sort: schema.arrayOf(sortSchema, {
    defaultValue: [{ sort_field: '@timestamp', sort_order: 'asc' }],
  }),
  filter: schema.maybe(schema.string()),
});

export type GetByRuleIdsOptionsType = TypeOf<typeof GetByRuleIdsOptionsSchema>;

interface ConstructorOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
  spacesService?: SpacesServiceStart;
  request: KibanaRequest;
}

export class ExecLogTransformClient {
  private logger: Logger;
  private esClient: ElasticsearchClient;
  private spacesService?: SpacesServiceStart;
  private request: KibanaRequest;

  constructor({ logger, esClient, spacesService, request }: ConstructorOptions) {
    this.logger = logger;
    this.esClient = esClient;
    this.spacesService = spacesService;
    this.request = request;
  }

  public async getByRuleIds(ids: string[], options: GetByRuleIdsOptionsType) {
    try {
      const { page, per_page: perPage, start, end, sort, filter } = options;
      const namespace = await this.getNamespace();
      const namespaceQuery = getNamespaceQuery(namespace);

      let filterKueryNode;
      try {
        filterKueryNode = JSON.parse(filter ?? '');
      } catch (e) {
        filterKueryNode = filter ? fromKueryExpression(filter) : null;
      }
      let dslFilterQuery: estypes.QueryDslBoolQuery['filter'];
      try {
        dslFilterQuery = filterKueryNode ? toElasticsearchQuery(filterKueryNode) : undefined;
      } catch (err) {
        this.logger.debug(
          `esContext: Invalid kuery syntax for the filter (${filter}) error: ${JSON.stringify({
            message: err.message,
            statusCode: err.statusCode,
          })}`
        );
        throw err;
      }

      const musts: estypes.QueryDslQueryContainer[] = [
        {
          terms: {
            'rule.data.alerting.rule_data.rule.id': ids,
          },
        },
        namespaceQuery,
      ];

      if (start) {
        musts.push({
          range: {
            '@timestamp': {
              gte: start,
            },
          },
        });
      }
      if (end) {
        musts.push({
          range: {
            '@timestamp': {
              lte: end,
            },
          },
        });
      }

      const body: estypes.SearchRequest['body'] = {
        size: perPage,
        from: (page - 1) * perPage,
        query: {
          bool: {
            ...(dslFilterQuery ? { filter: dslFilterQuery } : {}),
            must: musts,
          },
        },
        ...(sort
          ? { sort: sort.map((s) => ({ [s.sort_field]: { order: s.sort_order } })) as estypes.Sort }
          : {}),
      };
      this.logger.info(JSON.stringify(body));
      const {
        hits: { hits, total },
      } = await this.esClient.search({
        index: DESTINATION_INDEX,
        track_total_hits: true,
        body,
      });
      return {
        page,
        per_page: perPage,
        total: isNumber(total) ? total : total!.value,
        data: hits.map((hit) => hit._source),
      };
    } catch (err) {
      throw new Error(`querying for exec log for ids "${ids}" failed with: ${err.message}`);
    }
  }

  // public async getByAuthFilter(
  //   authFilter: KueryNode,
  //   namespace: string | undefined,
  //   options: GetByRuleIdsOptionsType
  // ) {
  //   if (!authFilter) {
  //     throw new Error('No authorization filter defined!');
  //   }

  //   const findOptions = queryOptionsSchema.validate(options ?? {});

  //   return await this.esContext.esAdapter.queryEventsWithAuthFilter({
  //     index: this.esContext.esNames.indexPattern,
  //     namespace: namespace
  //       ? this.spacesService?.spaceIdToNamespace(namespace)
  //       : await this.getNamespace(),
  //     type,
  //     ids,
  //     findOptions,
  //     authFilter,
  //   });
  // }

  private async getNamespace() {
    const space = await this.spacesService?.getActiveSpace(this.request);
    return space && this.spacesService?.spaceIdToNamespace(space.id);
  }
}

function getNamespaceQuery(namespace?: string) {
  return {
    term: {
      'rule.data.alerting.rule_data.kibana.space_ids': {
        value: namespace ? namespace : 'default',
      },
    },
  };
}
