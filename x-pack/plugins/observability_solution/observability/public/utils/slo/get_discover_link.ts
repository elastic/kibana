/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { kqlWithFiltersSchema, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Filter, FilterStateStore, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { buildEsQuery } from '../build_es_query';

function createDiscoverLocator(
  slo: SLOWithSummaryResponse,
  showBad = false,
  showGood = false,
  timeRange?: TimeRange
) {
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
    const customGoodFilter = buildEsQuery({ kuery: goodKuery, filters: goodFilters });
    const customBadFilter = { bool: { must_not: customGoodFilter } };

    filters.push({
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        type: 'custom',
        alias: i18n.translate('xpack.observability.slo.sloDetails.goodFilterLabel', {
          defaultMessage: 'Good events',
        }),
        disabled: !showGood,
        index: `${slo.indicator.params.index}-id`,
        value: JSON.stringify(customGoodFilter),
      },
      query: customGoodFilter as Record<string, any>,
    });

    filters.push({
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        type: 'custom',
        alias: i18n.translate('xpack.observability.slo.sloDetails.badFilterLabel', {
          defaultMessage: 'Bad events',
        }),
        disabled: !showBad,
        index: `${slo.indicator.params.index}-id`,
        value: JSON.stringify(customBadFilter),
      },
      query: customBadFilter as Record<string, any>,
    });
  }

  const timeFieldName =
    slo.indicator.type !== 'sli.apm.transactionDuration' &&
    slo.indicator.type !== 'sli.apm.transactionErrorRate'
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
      id: `${slo.indicator.params.index}-id`,
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
