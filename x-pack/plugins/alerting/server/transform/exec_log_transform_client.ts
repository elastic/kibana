/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap, get, isNumber } from 'lodash';
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

export const GetByRuleIdsOptionsSchema = schema.object({
  per_page: schema.number({ defaultValue: 10, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  start: optionalDateFieldSchema,
  end: optionalDateFieldSchema,
  filter: schema.maybe(schema.string()),
});

export type GetByRuleIdsOptionsType = TypeOf<typeof GetByRuleIdsOptionsSchema> & {
  sort: estypes.Sort;
};

export const ExecLogTransformFields: Record<string, string> = {
  timestamp: '@timestamp.min',
  rule_id: 'alerting.doc.rule.id',
  rule_name: 'alerting.doc.rule.id',
  space_ids: 'alerting.doc.kibana.space_ids',
  id: 'kibana.alert.rule.execution.uuid',
  status: 'alerting.doc.kibana.alerting.outcome',
  message: 'alerting.doc.message',
  execution_duration: 'alerting.doc.event.duration',
  total_search_duration:
    'alerting.doc.kibana.alert.rule.execution.metrics.total_search_duration_ms',
  es_search_duration: 'alerting.doc.kibana.alert.rule.execution.metrics.es_search_duration_ms',
  schedule_delay: 'alerting.doc.kibana.task.schedule_delay',
  num_triggered_actions:
    'alerting.doc.kibana.alert.rule.execution.metrics.number_of_triggered_actions',
  num_generated_actions:
    'alerting.doc.kibana.alert.rule.execution.metrics.number_of_generated_actions',
  num_active_alerts: 'alerting.doc.kibana.alert.rule.execution.metrics.alert_counts.active',
  num_recovered_alerts: 'alerting.doc.kibana.alert.rule.execution.metrics.alert_counts.recovered',
  num_new_alerts: 'alerting.doc.kibana.alert.rule.execution.metrics.alert_counts.new',
  num_succeeded_actions: 'actions.outcomes.success',
  num_errored_actions: 'actions.outcomes.failure',
  timed_out: 'alerting.timeout',
  version: 'alerting.doc.kibana.version',
};

const sortMissingOptionFields = [
  'execution_duration',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
  'num_triggered_actions',
  'num_generated_actions',
  'num_active_alerts',
  'num_new_alerts',
  'num_recovered_alerts',
  'num_succeeded_actions',
  'num_errored_actions',
];

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

      const sortFields = flatMap(sort as estypes.SortCombinations[], (s) => Object.keys(s));
      for (const field of sortFields) {
        if (!Object.keys(ExecLogTransformFields).includes(field)) {
          throw new Error(
            `Invalid sort field "${field}" - must be one of [${Object.keys(
              ExecLogTransformFields
            ).join(',')}]`
          );
        }
      }
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
            'alerting.doc.rule.id': ids,
          },
        },
        namespaceQuery,
      ];

      if (start) {
        musts.push({
          range: {
            '@timestamp.min': {
              gte: start,
            },
          },
        });
      }
      if (end) {
        musts.push({
          range: {
            '@timestamp.min': {
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
        ...(sort ? { sort: formatSortForBucketSort(sort) } : {}),
      };
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
      'alerting.doc.kibana.space_ids': {
        value: namespace ? namespace : 'default',
      },
    },
  };
}

export function formatSortForBucketSort(sort: estypes.Sort) {
  return (sort as estypes.SortCombinations[]).map((s) =>
    Object.keys(s).reduce(
      (acc, curr) => ({
        ...acc,
        [ExecLogTransformFields[curr]]: {
          ...get(s, curr),
          ...(sortMissingOptionFields.includes(curr) ? { missing: 0 } : {}),
        },
      }),
      {}
    )
  );
}
