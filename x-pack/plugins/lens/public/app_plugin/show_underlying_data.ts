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
import { DiscoverStart } from '../../../../../src/plugins/discover/public';
import { TableInspectorAdapter } from '../editor_frame_service/types';
import { Datasource } from '../types';

export const getShowUnderlyingDataLabel = () =>
  i18n.translate('xpack.lens.app.openInDiscover', {
    defaultMessage: 'Open in Discover',
  });

function joinQueries(queries: Query[][] | undefined) {
  if (!queries) {
    return '';
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
  filters: {
    kuery: Query[][] | undefined;
    lucene: Query[][] | undefined;
  };
}

export function getLayerMetaInfo(
  currentDatasource: Datasource,
  datasourceState: unknown,
  activeData: TableInspectorAdapter | undefined,
  discover: DiscoverStart | undefined
): { meta: LayerMetaInfo | undefined; isVisible: boolean; error: string | undefined } {
  const isVisible = Boolean(discover);
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
        defaultMessage: 'Underlying data cannot be shown for visualizations with multiple layers',
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
  //   if (datasourceAPI.datasourceId !== 'indexpattern') {
  //     return {
  //       meta: undefined,
  //       error: i18n.translate('xpack.lens.app.showUnderlyingDataUnsupportedDatasource', {
  //         defaultMessage: 'Underlying data does not support the current datasource',
  //       }),
  //       isVisible,
  //     };
  //   }
  const tableSpec = datasourceAPI.getTableSpec();

  const uniqueFields = [
    ...new Set(
      tableSpec
        .filter(({ columnId }) => !datasourceAPI.getOperationForColumnId(columnId)?.hasTimeShift)
        .map(({ fields }) => fields)
        .flat()
    ),
  ];
  // If no field, return?
  // if (!uniqueFields.length) {
  //   return {
  //     meta: undefined,
  //     error: i18n.translate('xpack.lens.app.showUnderlyingDataNoFields', {
  //       defaultMessage: 'The current visualization has not available fields to show',
  //     }),
  //     isVisible,
  //   };
  // }
  const layerFilters = datasourceAPI.getFilters();
  return {
    meta: { id: datasourceAPI.getSourceId()!, columns: uniqueFields, filters: layerFilters },
    error: undefined,
    isVisible,
  };
}

export function combineQueryAndFilters(
  query: Query,
  filters: Filter[],
  meta: LayerMetaInfo,
  dataViews: DataViewBase[] | undefined
) {
  const { queryLanguage, filtersLanguage }: Record<string, 'kuery' | 'lucene'> =
    query?.language === 'lucene'
      ? { queryLanguage: 'lucene', filtersLanguage: 'kuery' }
      : { queryLanguage: 'kuery', filtersLanguage: 'lucene' };

  // build here a query extension based on kql filters
  const filtersQuery = joinQueries(meta.filters[queryLanguage]);
  const newQuery = {
    language: filtersQuery,
    query: query ? `( ${query.query} ) ${filtersQuery ? `AND ${filtersQuery}` : ''}` : filtersQuery,
  };

  // extends the filters here with the lucene filters
  const queryExpression = joinQueries(meta.filters[filtersLanguage]);
  const newFilters = [
    ...filters,
    buildCustomFilter(
      meta.id!,
      buildEsQuery(
        dataViews?.find(({ id }) => id === meta.id),
        { language: filtersLanguage, query: queryExpression },
        []
      ),
      false,
      false,
      i18n.translate('xpack.lens.app.lensContext', {
        defaultMessage: 'Lens context ({language})',
        values: { language: filtersLanguage },
      }),
      FilterStateStore.APP_STATE
    ),
  ];
  return { filters: newFilters, query: newQuery };
}
