/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinksStart } from 'kibana/public';
import { EuiLink, EuiTextColor, EuiButton, EuiSpacer } from '@elastic/eui';

import { DatatableColumn } from 'src/plugins/expressions';
import { groupBy } from 'lodash';
import type { FramePublicAPI, StateSetter } from '../types';
import type { IndexPattern, IndexPatternLayer, IndexPatternPrivateState } from './types';
import type { ReferenceBasedIndexPatternColumn } from './operations/definitions/column_types';

import {
  operationDefinitionMap,
  GenericIndexPatternColumn,
  TermsIndexPatternColumn,
  CountIndexPatternColumn,
  updateColumnParam,
  updateDefaultLabels,
  RangeIndexPatternColumn,
  FormulaIndexPatternColumn,
} from './operations';

import { getInvalidFieldMessage, isColumnOfType } from './operations/definitions/helpers';
import { FiltersIndexPatternColumn, isQueryValid } from './operations/definitions/filters';
import { checkColumnForPrecisionError, Query } from '../../../../../src/plugins/data/common';
import { hasField } from './pure_utils';
import { mergeLayer } from './state_helpers';
import { DEFAULT_MAX_DOC_COUNT, supportsRarityRanking } from './operations/definitions/terms';

export function isColumnInvalid(
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern
) {
  const column: GenericIndexPatternColumn | undefined = layer.columns[columnId];
  if (!column || !indexPattern) return;

  const operationDefinition = column.operationType && operationDefinitionMap[column.operationType];
  // check also references for errors
  const referencesHaveErrors =
    true &&
    'references' in column &&
    Boolean(getReferencesErrors(layer, column, indexPattern).filter(Boolean).length);

  const operationErrorMessages =
    operationDefinition &&
    operationDefinition.getErrorMessage?.(layer, columnId, indexPattern, operationDefinitionMap);

  const filterHasError = column.filter ? !isQueryValid(column.filter, indexPattern) : false;

  return (
    (operationErrorMessages && operationErrorMessages.length > 0) ||
    referencesHaveErrors ||
    filterHasError
  );
}

function getReferencesErrors(
  layer: IndexPatternLayer,
  column: ReferenceBasedIndexPatternColumn,
  indexPattern: IndexPattern
) {
  return column.references?.map((referenceId: string) => {
    const referencedOperation = layer.columns[referenceId]?.operationType;
    const referencedDefinition = operationDefinitionMap[referencedOperation];
    return referencedDefinition?.getErrorMessage?.(
      layer,
      referenceId,
      indexPattern,
      operationDefinitionMap
    );
  });
}

export function fieldIsInvalid(
  column: GenericIndexPatternColumn | undefined,
  indexPattern: IndexPattern
) {
  if (!column || !hasField(column)) {
    return false;
  }
  return !!getInvalidFieldMessage(column, indexPattern)?.length;
}

export function getPrecisionErrorWarningMessages(
  state: IndexPatternPrivateState,
  { activeData }: FramePublicAPI,
  docLinks: DocLinksStart,
  setState: StateSetter<IndexPatternPrivateState>
) {
  const warningMessages: React.ReactNode[] = [];

  if (state && activeData) {
    Object.entries(activeData)
      .reduce(
        (acc, [layerId, { columns }]) => [
          ...acc,
          ...columns.map((column) => ({ layerId, column })),
        ],
        [] as Array<{ layerId: string; column: DatatableColumn }>
      )
      .forEach(({ layerId, column }) => {
        const currentLayer = state.layers[layerId];
        const currentColumn = currentLayer?.columns[column.id];
        if (currentLayer && currentColumn && checkColumnForPrecisionError(column)) {
          const indexPattern = state.indexPatterns[currentLayer.indexPatternId];
          const isAscendingCountSorting =
            isColumnOfType<TermsIndexPatternColumn>('terms', currentColumn) &&
            currentColumn.params.orderBy.type === 'column' &&
            currentColumn.params.orderDirection === 'asc' &&
            isColumnOfType<CountIndexPatternColumn>(
              'count',
              currentLayer.columns[currentColumn.params.orderBy.columnId]
            );
          const usesFloatingPointField =
            isColumnOfType<TermsIndexPatternColumn>('terms', currentColumn) &&
            !supportsRarityRanking(indexPattern.getFieldByName(currentColumn.sourceField));
          const usesMultipleFields =
            isColumnOfType<TermsIndexPatternColumn>('terms', currentColumn) &&
            (currentColumn.params.secondaryFields || []).length > 0;
          if (!isAscendingCountSorting || usesFloatingPointField || usesMultipleFields) {
            warningMessages.push(
              <FormattedMessage
                id="xpack.lens.indexPattern.precisionErrorWarning"
                defaultMessage="{name} for this visualization may be approximate due to how the data is indexed. Try increasing the number of {topValues} or use {filters} instead of {topValues} for precise results. To learn more about this limit, {link}."
                values={{
                  name: <EuiTextColor color="accent">{column.name}</EuiTextColor>,
                  topValues: (
                    <EuiTextColor color="subdued">
                      <FormattedMessage
                        id="xpack.lens.indexPattern.precisionErrorWarning.topValues"
                        defaultMessage="Top values"
                      />
                    </EuiTextColor>
                  ),
                  filters: (
                    <EuiTextColor color="subdued">
                      <FormattedMessage
                        id="xpack.lens.indexPattern.precisionErrorWarning.filters"
                        defaultMessage="Filters"
                      />
                    </EuiTextColor>
                  ),
                  link: (
                    <EuiLink
                      href={docLinks.links.aggs.terms_doc_count_error}
                      color="text"
                      target="_blank"
                      external={true}
                    >
                      <FormattedMessage
                        defaultMessage="visit the documentation"
                        id="xpack.lens.indexPattern.precisionErrorWarning.link"
                      />
                    </EuiLink>
                  ),
                }}
              />
            );
          } else {
            warningMessages.push(
              <>
                <FormattedMessage
                  id="xpack.lens.indexPattern.ascendingCountPrecisionErrorWarning"
                  defaultMessage="{name} for this visualization may be approximate due to how the data is indexed. Try sorting by rarity instead of ascending count of records. To learn more about this limit, {link}."
                  values={{
                    name: <EuiTextColor color="accent">{column.name}</EuiTextColor>,
                    link: (
                      <EuiLink
                        href={docLinks.links.aggs.rare_terms}
                        color="text"
                        target="_blank"
                        external={true}
                      >
                        <FormattedMessage
                          defaultMessage="visit the documentation"
                          id="xpack.lens.indexPattern.ascendingCountPrecisionErrorWarning.link"
                        />
                      </EuiLink>
                    ),
                  }}
                />
                <EuiSpacer size="s" />
                <EuiButton
                  onClick={() => {
                    setState((prevState) =>
                      mergeLayer({
                        state: prevState,
                        layerId,
                        newLayer: updateDefaultLabels(
                          updateColumnParam({
                            layer: currentLayer,
                            columnId: column.id,
                            paramName: 'orderBy',
                            value: {
                              type: 'rare',
                              maxDocCount: DEFAULT_MAX_DOC_COUNT,
                            },
                          }),
                          indexPattern
                        ),
                      })
                    );
                  }}
                >
                  {i18n.translate('xpack.lens.indexPattern.switchToRare', {
                    defaultMessage: 'Rank by rarity',
                  })}
                </EuiButton>
              </>
            );
          }
        }
      });
  }

  return warningMessages;
}

export function getVisualDefaultsForLayer(layer: IndexPatternLayer) {
  return Object.keys(layer.columns).reduce<Record<string, Record<string, unknown>>>(
    (memo, columnId) => {
      const column = layer.columns[columnId];
      if (column?.operationType) {
        const opDefinition = operationDefinitionMap[column.operationType];
        const params = opDefinition.getDefaultVisualSettings?.(column);
        if (params) {
          memo[columnId] = params;
        }
      }
      return memo;
    },
    {}
  );
}

export function getFiltersInLayer(layer: IndexPatternLayer, columnIds: string[]) {
  // extract filters from filtered metrics
  // consider all the columns, included referenced ones to cover also the formula case
  const filteredMetrics = Object.keys(layer.columns)
    .map((colId) => {
      // there's a special case to handle when a formula has a global filter applied
      // in this case ignore the filter on the formula column and only use the filter
      // applied to the referenced columns.
      // This will avoid duplicate filters and issues when a global formula filter is
      // combine to specific referenced columns filters
      if (
        isColumnOfType<FormulaIndexPatternColumn>('formula', layer.columns[colId]) &&
        layer.columns[colId]?.filter
      ) {
        return null;
      }
      return layer.columns[colId]?.filter;
    })
    // filter out empty filters as well
    .filter((filter) => filter?.query?.trim()) as Query[];

  const { kuery: kqlMetricQueries, lucene: luceneMetricQueries } = groupBy(
    filteredMetrics,
    'language'
  );

  function extractUsefulQueries(
    queries: FiltersIndexPatternColumn['params']['filters'] | undefined
  ) {
    return queries?.map(({ input }) => input).filter(({ query }) => query?.trim() && query !== '*');
  }

  const filterOperation = columnIds
    .map((colId) => {
      const column = layer.columns[colId];

      if (isColumnOfType<FiltersIndexPatternColumn>('filters', column)) {
        const groupsByLanguage = groupBy(
          column.params.filters,
          ({ input }) => input.language
        ) as Record<'lucene' | 'kuery', FiltersIndexPatternColumn['params']['filters']>;
        return {
          kuery: extractUsefulQueries(groupsByLanguage.kuery),
          lucene: extractUsefulQueries(groupsByLanguage.lucene),
        };
      }
      if (isColumnOfType<RangeIndexPatternColumn>('range', column) && column.sourceField) {
        return {
          kuery: column.params.ranges
            .map(({ from, to }) => {
              let rangeQuery = '';
              if (from != null && isFinite(from)) {
                rangeQuery += `${column.sourceField} >= ${from}`;
              }
              if (to != null && isFinite(to)) {
                if (rangeQuery.length) {
                  rangeQuery += ' AND ';
                }
                rangeQuery += `${column.sourceField} <= ${to}`;
              }
              return {
                query: rangeQuery,
                language: 'kuery',
              };
            })
            .filter(({ query }) => query?.trim()),
        };
      }
      if (
        isColumnOfType<TermsIndexPatternColumn>('terms', column) &&
        !(column.params.otherBucket || column.params.missingBucket)
      ) {
        // TODO: return field -> terms?
        // TODO: support multi-terms?
        return {
          kuery: [{ query: `${column.sourceField}: *`, language: 'kuery' }].concat(
            column.params.secondaryFields?.map((field) => ({
              query: `${field}: *`,
              language: 'kuery',
            })) || []
          ),
        };
      }
    })
    .filter(Boolean) as Array<{ kuery?: Query[]; lucene?: Query[] }>;
  return {
    kuery: [kqlMetricQueries, ...filterOperation.map(({ kuery }) => kuery)].filter(
      (filters) => filters?.length
    ) as Query[][],
    lucene: [luceneMetricQueries, ...filterOperation.map(({ lucene }) => lucene)].filter(
      (filters) => filters?.length
    ) as Query[][],
  };
}
