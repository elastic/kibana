/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Query,
  Filter,
  DataViewBase,
  buildCustomFilter,
  buildEsQuery,
  FilterStateStore,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { RecursiveReadonly } from '@kbn/utility-types';
import { Capabilities } from 'kibana/public';
import { partition } from 'lodash';
import { TableInspectorAdapter } from '../editor_frame_service/types';
import { Datasource } from '../types';

export const getShowUnderlyingDataLabel = () =>
  i18n.translate('xpack.lens.app.exploreRawData', {
    defaultMessage: 'Explore data in Discover',
  });

/**
 * Joins a series of queries.
 *
 * Uses "AND" along dimension 1 and "OR" along dimension 2
 */
function joinQueries(queries: Query[][]) {
  // leave a single query alone
  if (queries.length === 1 && queries[0].length === 1) {
    return queries[0][0].query;
  }

  const expression = queries
    .filter((subQueries) => subQueries.length)
    .map((subQueries) =>
      // reduce the amount of round brackets in case of one query
      subQueries.length > 1
        ? `( ${subQueries.map(({ query: filterQuery }) => `( ${filterQuery} )`).join(' OR ')} )`
        : `( ${subQueries[0].query} )`
    )
    .join(' AND ');
  return queries.length > 1 ? `( ${expression} )` : expression;
}

interface LayerMetaInfo {
  id: string;
  columns: string[];
  filters: Record<
    'enabled' | 'disabled',
    {
      kuery: Query[][] | undefined;
      lucene: Query[][] | undefined;
    }
  >;
}

export function getLayerMetaInfo(
  currentDatasource: Datasource | undefined,
  datasourceState: unknown,
  activeData: TableInspectorAdapter | undefined,
  capabilities: RecursiveReadonly<{
    navLinks: Capabilities['navLinks'];
    discover?: Capabilities['discover'];
  }>
): { meta: LayerMetaInfo | undefined; isVisible: boolean; error: string | undefined } {
  const isVisible = Boolean(capabilities.navLinks?.discover && capabilities.discover?.show);
  // If Multiple tables, return
  // If there are time shifts, return
  const [datatable, ...otherTables] = Object.values(activeData || {});
  if (!datatable || !currentDatasource || !datasourceState) {
    return {
      meta: undefined,
      error: i18n.translate('xpack.lens.app.showUnderlyingDataNoData', {
        defaultMessage: 'Visualization has no data available to show',
      }),
      isVisible,
    };
  }
  if (otherTables.length) {
    return {
      meta: undefined,
      error: i18n.translate('xpack.lens.app.showUnderlyingDataMultipleLayers', {
        defaultMessage: 'Cannot show underlying data for visualizations with multiple layers',
      }),
      isVisible,
    };
  }
  const [firstLayerId] = currentDatasource.getLayers(datasourceState);
  const datasourceAPI = currentDatasource.getPublicAPI({
    layerId: firstLayerId,
    state: datasourceState,
  });
  // maybe add also datasourceId validation here?
  if (datasourceAPI.datasourceId !== 'indexpattern') {
    return {
      meta: undefined,
      error: i18n.translate('xpack.lens.app.showUnderlyingDataUnsupportedDatasource', {
        defaultMessage: 'Underlying data does not support the current datasource',
      }),
      isVisible,
    };
  }
  const tableSpec = datasourceAPI.getTableSpec();

  const columnsWithNoTimeShifts = tableSpec.filter(
    ({ columnId }) => !datasourceAPI.getOperationForColumnId(columnId)?.hasTimeShift
  );
  if (columnsWithNoTimeShifts.length < tableSpec.length) {
    return {
      meta: undefined,
      error: i18n.translate('xpack.lens.app.showUnderlyingDataTimeShifts', {
        defaultMessage: "Cannot show underlying data when there's a time shift configured",
      }),
      isVisible,
    };
  }

  const uniqueFields = [...new Set(columnsWithNoTimeShifts.map(({ fields }) => fields).flat())];
  return {
    meta: {
      id: datasourceAPI.getSourceId()!,
      columns: uniqueFields,
      filters: datasourceAPI.getFilters(activeData),
    },
    error: undefined,
    isVisible,
  };
}

// This enforces on assignment time that the two props are not the same
type QueryLanguage = 'lucene' | 'kuery';

/**
 * Translates an arbitrarily-large set of @type {Query}s (including those supplied in @type {LayerMetaInfo})
 * and existing Kibana @type {Filter}s into a single query and a new set of @type {Filter}s. This allows them to
 * function as an equivalent context in Discover.
 *
 * If some of the queries are in KQL and some in Lucene, all the queries in one language will be merged into
 * a large query to be shown in the query bar, while the queries in the other language will be encoded as an
 * extra filter pill.
 */
export function combineQueryAndFilters(
  query: Query | Query[] | undefined,
  filters: Filter[],
  meta: LayerMetaInfo,
  dataViews: DataViewBase[] | undefined
) {
  const queries: {
    kuery: Query[];
    lucene: Query[];
  } = {
    kuery: [],
    lucene: [],
  };

  const allQueries = Array.isArray(query) ? query : query ? [query] : [];
  const nonEmptyQueries = allQueries.filter((q) => Boolean(q.query.trim()));

  [queries.lucene, queries.kuery] = partition(nonEmptyQueries, (q) => q.language === 'lucene');

  const queryLanguage: QueryLanguage =
    (nonEmptyQueries[0]?.language as QueryLanguage | undefined) || 'kuery';

  const newQuery = {
    language: queryLanguage,
    query: joinQueries([
      ...queries[queryLanguage].map((q) => [q]),
      ...(meta.filters.enabled[queryLanguage] || []),
    ]),
  };

  const filtersLanguage = queryLanguage === 'lucene' ? 'kuery' : 'lucene';

  // make a copy as the original filters are readonly
  const newFilters = [...filters];

  const dataView = dataViews?.find(({ id }) => id === meta.id);

  const hasQueriesInFiltersLanguage = Boolean(
    meta.filters.enabled[filtersLanguage]?.length || queries[filtersLanguage].length
  );

  if (hasQueriesInFiltersLanguage) {
    const queryExpression = joinQueries([
      ...queries[filtersLanguage].map((q) => [q]),
      ...(meta.filters.enabled[filtersLanguage] || []),
    ]);

    // Create new filter to encode the rest of the query information
    newFilters.push(
      buildCustomFilter(
        meta.id!,
        buildEsQuery(dataView, { language: filtersLanguage, query: queryExpression }, []),
        false,
        false,
        i18n.translate('xpack.lens.app.lensContext', {
          defaultMessage: 'Lens context ({language})',
          values: { language: filtersLanguage },
        }),
        FilterStateStore.APP_STATE
      )
    );
  }

  // for each disabled filter create a new custom filter and disable it
  // note that both languages go into the filter bar
  for (const language of ['lucene', 'kuery'] as const) {
    const [disabledQueries] = meta.filters.disabled[language] || [];
    for (const disabledQuery of disabledQueries || []) {
      let label = disabledQuery.query as string;
      if (language === 'lucene') {
        label += ` (${language})`;
      }
      newFilters.push(
        buildCustomFilter(
          meta.id!,
          buildEsQuery(dataView, disabledQuery, []),
          true,
          false,
          label,
          FilterStateStore.APP_STATE
        )
      );
    }
  }

  return { filters: newFilters, query: newQuery };
}
