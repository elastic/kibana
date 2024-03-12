/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { ALL_VALUE, kqlWithFiltersSchema, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Filter, FilterStateStore, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { buildEsQuery } from '@kbn/observability-plugin/public';
import { v4 } from 'uuid';
import { isEmpty } from 'lodash';

function createDiscoverLocator(
  slo: SLOWithSummaryResponse,
  showBad = false,
  showGood = false,
  timeRange?: TimeRange
) {
  const indexId = v4();
  const filters: Filter[] = [];

  if (kqlWithFiltersSchema.is(slo.indicator.params.filter)) {
    slo.indicator.params.filter.filters.forEach((i) => filters.push(i));
  }

  const filterKuery = kqlWithFiltersSchema.is(slo.indicator.params.filter)
    ? slo.indicator.params.filter.kqlQuery
    : slo.indicator.params.filter;

  if (slo.indicator.type === 'sli.kql.custom') {
    const goodKuery = kqlWithFiltersSchema.is(slo.indicator.params.good)
      ? slo.indicator.params.good.kqlQuery
      : slo.indicator.params.good;
    const goodFilters = kqlWithFiltersSchema.is(slo.indicator.params.good)
      ? slo.indicator.params.good.filters
      : [];
    const totalKuery = kqlWithFiltersSchema.is(slo.indicator.params.total)
      ? slo.indicator.params.total.kqlQuery
      : slo.indicator.params.total;
    const totalFilters = kqlWithFiltersSchema.is(slo.indicator.params.total)
      ? slo.indicator.params.total.filters
      : [];
    const customGoodFilter = buildEsQuery({ kuery: goodKuery, filters: goodFilters });
    const customTotalFilter = buildEsQuery({ kuery: totalKuery, filters: totalFilters });
    const customBadFilter = { bool: { filter: customTotalFilter, must_not: customGoodFilter } };

    filters.push({
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        type: 'custom',
        alias: i18n.translate('xpack.slo.sloDetails.goodFilterLabel', {
          defaultMessage: 'Good events',
        }),
        disabled: !showGood,
        value: JSON.stringify(customGoodFilter),
        index: indexId,
      },
      query: customGoodFilter as Record<string, any>,
    });

    filters.push({
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        type: 'custom',
        alias: i18n.translate('xpack.slo.sloDetails.badFilterLabel', {
          defaultMessage: 'Bad events',
        }),
        disabled: !showBad,
        value: JSON.stringify(customBadFilter),
        index: indexId,
      },
      query: customBadFilter as Record<string, any>,
    });

    filters.push({
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        type: 'custom',
        alias: i18n.translate('xpack.slo.sloDetails.totalFilterLabel', {
          defaultMessage: 'Total events',
        }),
        value: JSON.stringify(customTotalFilter),
        index: indexId,
      },
      query: customTotalFilter as Record<string, any>,
    });
  }

  const groupBy = [slo.groupBy].flat();

  if (
    !isEmpty(slo.groupings) &&
    groupBy.length > 0 &&
    groupBy.every((field) => field === ALL_VALUE) === false
  ) {
    groupBy.forEach((field) => {
      filters.push({
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          key: field,
          params: {
            query: slo.groupings[field],
          },
          type: 'phrase',
          index: indexId,
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        query: {
          match_phrase: {
            [field]: slo.groupings[field],
          },
        },
      });
    });
  }

  const timeFieldName =
    slo.indicator.type !== 'sli.apm.transactionDuration' &&
    slo.indicator.type !== 'sli.apm.transactionErrorRate' &&
    slo.indicator.type !== 'sli.synthetics.availability'
      ? slo.indicator.params.timestampField
      : '@timestamp';

  return {
    timeRange,
    query: {
      query: filterKuery || '',
      language: 'kuery',
    },
    filters,
    dataViewSpec: {
      id: indexId,
      title: slo.indicator.params.index,
      timeFieldName,
    },
  };
}

export function getDiscoverLink(
  discover: DiscoverStart,
  slo: SLOWithSummaryResponse,
  timeRange: TimeRange
) {
  const config = createDiscoverLocator(slo, false, false, timeRange);
  return discover?.locator?.getRedirectUrl(config);
}

export function openInDiscover(
  discover: DiscoverStart,
  slo: SLOWithSummaryResponse,
  showBad = false,
  showGood = false,
  timeRange?: TimeRange
) {
  const config = createDiscoverLocator(slo, showBad, showGood, timeRange);
  discover?.locator?.navigate(config);
}
