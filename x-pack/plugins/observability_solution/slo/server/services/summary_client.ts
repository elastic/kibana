/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsSumAggregate,
  AggregationsTopHitsAggregate,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  calendarAlignedTimeWindowSchema,
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { SLO_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { Groupings, Meta, SLODefinition, Summary } from '../domain/models';
import { computeSLI, computeSummaryStatus, toErrorBudget } from '../domain/services';
import { toDateRange } from '../domain/services/date_range';
import { getFlattenedGroupings } from './utils';
import { computeTotalSlicesFromDateRange } from './utils/compute_total_slices_from_date_range';

interface Params {
  slo: SLODefinition;
  instanceId?: string;
  remoteName?: string;
}

interface SummaryResult {
  summary: Summary;
  groupings: Groupings;
  meta: Meta;
}

// This is called "SummaryClient" but is responsible for:
// - computing summary
// - formatting groupings
// - adding extra Meta parameter for synthetics
export interface SummaryClient {
  computeSummary(params: Params): Promise<SummaryResult>;
}

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async computeSummary({ slo, instanceId, remoteName }: Params): Promise<SummaryResult> {
    const dateRange = toDateRange(slo.timeWindow);
    const isDefinedWithGroupBy = ![slo.groupBy].flat().includes(ALL_VALUE);
    const hasInstanceId = instanceId !== ALL_VALUE;
    const shouldIncludeInstanceIdFilter = isDefinedWithGroupBy && hasInstanceId;

    const instanceIdFilter = shouldIncludeInstanceIdFilter
      ? [{ term: { 'slo.instanceId': instanceId } }]
      : [];

    const result = await this.esClient.search<
      any,
      {
        good: AggregationsSumAggregate;
        total: AggregationsSumAggregate;
        last_doc: AggregationsTopHitsAggregate;
      }
    >({
      index: remoteName
        ? `${remoteName}:${SLO_DESTINATION_INDEX_PATTERN}`
        : SLO_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { 'slo.id': slo.id } },
            { term: { 'slo.revision': slo.revision } },
            {
              range: {
                '@timestamp': {
                  gte: dateRange.from.toISOString(),
                  lte: dateRange.to.toISOString(),
                },
              },
            },
            ...instanceIdFilter,
          ],
        },
      },
      aggs: {
        ...(shouldIncludeInstanceIdFilter && {
          last_doc: {
            top_hits: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: ['slo.groupings', 'monitor', 'observer', 'config_id'],
              },
              size: 1,
            },
          },
        }),
        ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
          good: {
            sum: { field: 'slo.isGoodSlice' },
          },
          total: {
            value_count: { field: 'slo.isGoodSlice' },
          },
        }),
        ...(occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) && {
          good: { sum: { field: 'slo.numerator' } },
          total: { sum: { field: 'slo.denominator' } },
        }),
      },
    });

    const good = result.aggregations?.good?.value ?? 0;
    const total = result.aggregations?.total?.value ?? 0;
    const source = result.aggregations?.last_doc?.hits?.hits?.[0]?._source;
    const groupings = source?.slo?.groupings;

    let sliValue;
    if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      const totalSlices = computeTotalSlicesFromDateRange(
        dateRange,
        slo.objective.timesliceWindow!
      );

      sliValue = computeSLI(good, total, totalSlices);
    } else {
      sliValue = computeSLI(good, total);
    }

    const initialErrorBudget = 1 - slo.objective.target;
    const consumedErrorBudget = sliValue < 0 ? 0 : (1 - sliValue) / initialErrorBudget;
    const errorBudget = toErrorBudget(
      initialErrorBudget,
      consumedErrorBudget,
      calendarAlignedTimeWindowSchema.is(slo.timeWindow) &&
        occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)
    );

    return {
      summary: {
        sliValue,
        errorBudget,
        status: computeSummaryStatus(slo.objective, sliValue, errorBudget),
      },
      groupings: groupings ? getFlattenedGroupings({ groupBy: slo.groupBy, groupings }) : {},
      meta: getMetaFields(slo, source ?? {}),
    };
  }
}

function getMetaFields(
  slo: SLODefinition,
  source: { monitor?: { id?: string }; config_id?: string; observer?: { name?: string } }
): Meta {
  const {
    indicator: { type },
  } = slo;
  switch (type) {
    case 'sli.synthetics.availability':
      return {
        synthetics: {
          monitorId: source.monitor?.id ?? '',
          locationId: source.observer?.name ?? '',
          configId: source.config_id ?? '',
        },
      };
    default:
      return {};
  }
}
