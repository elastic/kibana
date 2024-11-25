/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import {
  GetOverviewParams,
  GetOverviewResponse,
} from '@kbn/slo-schema/src/rest_specs/routes/get_overview';
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import moment from 'moment';
import { observabilityAlertFeatureIds } from '@kbn/observability-plugin/common';
import { typedSearch } from '../utils/queries';
import { getElasticsearchQueryOrThrow, parseStringFilters } from './transform_generators';
import { getListOfSummaryIndices, getSloSettings } from './slo_settings';

export class GetSLOsOverview {
  constructor(
    private soClient: SavedObjectsClientContract,
    private esClient: ElasticsearchClient,
    private spaceId: string,
    private logger: Logger,
    private rulesClient: RulesClientApi,
    private racClient: AlertsClient
  ) {}

  public async execute(params: GetOverviewParams = {}): Promise<GetOverviewResponse> {
    const settings = await getSloSettings(this.soClient);
    const { indices } = await getListOfSummaryIndices(this.esClient, settings);

    const kqlQuery = params.kqlQuery ?? '';
    const filters = params.filters ?? '';
    const parsedFilters = parseStringFilters(filters, this.logger);

    const response = await typedSearch(this.esClient, {
      index: indices,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { spaceId: this.spaceId } },
            getElasticsearchQueryOrThrow(kqlQuery),
            ...(parsedFilters.filter ?? []),
          ],
          must_not: [...(parsedFilters.must_not ?? [])],
        },
      },
      body: {
        aggs: {
          stale: {
            filter: {
              range: {
                summaryUpdatedAt: {
                  lt: 'now-48h',
                },
              },
            },
          },
          not_stale: {
            filter: {
              range: {
                summaryUpdatedAt: {
                  gte: 'now-48h',
                },
              },
            },
            aggs: {
              violated: {
                filter: {
                  term: {
                    status: 'VIOLATED',
                  },
                },
              },
              healthy: {
                filter: {
                  term: {
                    status: 'HEALTHY',
                  },
                },
              },
              degrading: {
                filter: {
                  term: {
                    status: 'DEGRADING',
                  },
                },
              },
              noData: {
                filter: {
                  term: {
                    status: 'NO_DATA',
                  },
                },
              },
            },
          },
        },
      },
    });

    const [rules, alerts] = await Promise.all([
      this.rulesClient.find({
        options: {
          search: 'alert.attributes.alertTypeId:("slo.rules.burnRate")',
        },
      }),

      this.racClient.getAlertSummary({
        featureIds: observabilityAlertFeatureIds,
        gte: moment().subtract(24, 'hours').toISOString(),
        lte: moment().toISOString(),
        filter: [
          {
            term: {
              'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
            },
          },
        ],
      }),
    ]);

    const aggs = response.aggregations;

    return {
      violated: aggs?.not_stale?.violated.doc_count ?? 0,
      degrading: aggs?.not_stale?.degrading.doc_count ?? 0,
      healthy: aggs?.not_stale?.healthy?.doc_count ?? 0,
      noData: aggs?.not_stale?.noData.doc_count ?? 0,
      stale: aggs?.stale.doc_count ?? 0,
      worst: {
        value: 0,
        id: 'id',
      },
      burnRateRules: rules.total,
      burnRateActiveAlerts: alerts.activeAlertCount,
      burnRateRecoveredAlerts: alerts.recoveredAlertCount,
    };
  }
}
