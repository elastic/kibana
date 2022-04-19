/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinksStart } from '@kbn/core/public';
import { EuiLink, EuiTextColor, EuiButton, EuiSpacer } from '@elastic/eui';

import { DatatableColumn } from '@kbn/expressions-plugin';
import { groupBy, escape } from 'lodash';
import { checkColumnForPrecisionError, Query } from '@kbn/data-plugin/common';
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
import { hasField } from './pure_utils';
import { mergeLayer } from './state_helpers';
import { supportsRarityRanking } from './operations/definitions/terms';
import { DEFAULT_MAX_DOC_COUNT } from './operations/definitions/terms/constants';
import { getOriginalId } from '../../common/expressions';

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

const accuracyModeDisabledWarning = (
  columnName: string,
  docLink: string,
  enableAccuracyMode: () => void
) => (
  <>
    <FormattedMessage
      id="xpack.lens.indexPattern.precisionErrorWarning.accuracyDisabled"
      defaultMessage="{name} might be an approximation. You can enable accuracy mode for more precise results, but note that it increases the load on the Elasticsearch cluster. {learnMoreLink}"
      values={{
        name: <EuiTextColor color="accent">{columnName}</EuiTextColor>,
        learnMoreLink: (
          <EuiLink href={docLink} color="text" target="_blank" external={true}>
            <FormattedMessage
              defaultMessage="Learn more."
              id="xpack.lens.indexPattern.precisionErrorWarning.link"
            />
          </EuiLink>
        ),
      }}
    />
    <EuiSpacer size="s" />
    <EuiButton data-test-subj="lnsPrecisionWarningEnableAccuracy" onClick={enableAccuracyMode}>
      {i18n.translate('xpack.lens.indexPattern.enableAccuracyMode', {
        defaultMessage: 'Enable accuracy mode',
      })}
    </EuiButton>
  </>
);

const accuracyModeEnabledWarning = (columnName: string, docLink: string) => (
  <FormattedMessage
    id="xpack.lens.indexPattern.precisionErrorWarning.accuracyEnabled"
    defaultMessage="{name} might be an approximation. For more precise results, try increasing the number of {topValues} or using {filters} instead. {learnMoreLink}"
    values={{
      name: <EuiTextColor color="accent">{columnName}</EuiTextColor>,
      topValues: (
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.lens.indexPattern.precisionErrorWarning.topValues"
            defaultMessage="top values"
          />
        </EuiTextColor>
      ),
      filters: (
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.lens.indexPattern.precisionErrorWarning.filters"
            defaultMessage="filters"
          />
        </EuiTextColor>
      ),
      learnMoreLink: (
        <EuiLink href={docLink} color="text" target="_blank" external={true}>
          <FormattedMessage
            defaultMessage="Learn more."
            id="xpack.lens.indexPattern.precisionErrorWarning.link"
          />
        </EuiLink>
      ),
    }}
  />
);

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
          // currentColumnIsTerms is mostly a type guard. If there's a precision error,
          // we already know that we're dealing with a terms-based operation (at least for now).
          const currentColumnIsTerms = isColumnOfType<TermsIndexPatternColumn>(
            'terms',
            currentColumn
          );
          const isAscendingCountSorting =
            currentColumnIsTerms &&
            currentColumn.params.orderBy.type === 'column' &&
            currentColumn.params.orderDirection === 'asc' &&
            isColumnOfType<CountIndexPatternColumn>(
              'count',
              currentLayer.columns[currentColumn.params.orderBy.columnId]
            );
          const usesFloatingPointField =
            currentColumnIsTerms &&
            !supportsRarityRanking(indexPattern.getFieldByName(currentColumn.sourceField));
          const usesMultipleFields =
            currentColumnIsTerms && (currentColumn.params.secondaryFields || []).length > 0;

          if (
            currentColumnIsTerms &&
            (!isAscendingCountSorting || usesFloatingPointField || usesMultipleFields)
          ) {
            warningMessages.push(
              currentColumn.params.accuracyMode
                ? accuracyModeEnabledWarning(column.name, docLinks.links.aggs.terms_doc_count_error)
                : accuracyModeDisabledWarning(
                    column.name,
                    docLinks.links.aggs.terms_doc_count_error,
                    () => {
                      setState((prevState) =>
                        mergeLayer({
                          state: prevState,
                          layerId,
                          newLayer: updateDefaultLabels(
                            updateColumnParam({
                              layer: currentLayer,
                              columnId: column.id,
                              paramName: 'accuracyMode',
                              value: true,
                            }),
                            indexPattern
                          ),
                        })
                      );
                    }
                  )
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

/**
 * Some utilities to extract queries/filters from specific column types
 */

/**
 * Given a Filters column, extract and filter useful queries from it
 */
function extractQueriesFromFilters(
  queries: FiltersIndexPatternColumn['params']['filters'] | undefined
) {
  return queries?.map(({ input }) => input).filter(({ query }) => query?.trim() && query !== '*');
}

/**
 * Given an Interval column in range mode transform the ranges into KQL queries
 */
function extractQueriesFromRanges(column: RangeIndexPatternColumn) {
  return column.params.ranges
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
    .filter(({ query }) => query?.trim());
}

/**
 * Given an Terms/Top values column transform each entry into a "field: term" KQL query
 * This works also for multi-terms variant
 */
function extractQueriesFromTerms(
  column: TermsIndexPatternColumn,
  colId: string,
  data: NonNullable<FramePublicAPI['activeData']>[string]
): Query[] {
  const fields = [column.sourceField]
    .concat(column.params.secondaryFields || [])
    .filter(Boolean) as string[];

  // extract the filters from the columns of the activeData
  const queries = data.rows
    .map(({ [colId]: value }) => {
      if (value == null) {
        return;
      }
      if (typeof value !== 'string' && Array.isArray(value.keys)) {
        return value.keys
          .map(
            (term: string, index: number) =>
              `${fields[index]}: ${`"${term === '' ? escape(term) : term}"`}`
          )
          .join(' AND ');
      }
      return `${column.sourceField}: ${`"${value === '' ? escape(value) : value}"`}`;
    })
    .filter(Boolean) as string[];

  // dedup queries before returning
  return [...new Set(queries)].map((query) => ({ language: 'kuery', query }));
}

/**
 * Used for a Terms column to decide whether to use a simple existence query (fallback) instead
 * of more specific queries.
 * The check targets the scenarios where no data is available, or when there's a transposed table
 * and it's not yet possible to track it back to the original table
 */
function shouldUseTermsFallback(
  data: NonNullable<FramePublicAPI['activeData']>[string] | undefined,
  colId: string
) {
  const dataId = data?.columns.find(({ id }) => getOriginalId(id) === colId)?.id;
  return !dataId || dataId !== colId;
}

/**
 * Collect filters from metrics:
 * * if there's at least one unfiltered metric, then just return an empty list of filters
 * * otherwise get all the filters, with the only exception of those from formula (referenced columns will have it anyway)
 */
function collectFiltersFromMetrics(layer: IndexPatternLayer, columnIds: string[]) {
  // Isolate filtered metrics first
  // mind to ignore non-filterable columns and formula columns
  const metricColumns = Object.keys(layer.columns).filter((colId) => {
    const column = layer.columns[colId];
    const operationDefinition = operationDefinitionMap[column?.operationType];
    return (
      !column?.isBucketed &&
      // global filters for formulas are picked up by referenced columns
      !isColumnOfType<FormulaIndexPatternColumn>('formula', column) &&
      operationDefinition?.filterable
    );
  });
  const { filtered = [], unfiltered = [] } = groupBy(metricColumns, (colId) =>
    layer.columns[colId]?.filter ? 'filtered' : 'unfiltered'
  );

  const filteredMetrics = filtered
    .map((colId) => layer.columns[colId]?.filter)
    // filter out empty filters as well
    .filter((filter) => filter?.query?.trim()) as Query[];

  return {
    enabled: unfiltered.length ? [] : filteredMetrics,
    disabled: unfiltered.length ? filteredMetrics : [],
  };
}

interface GroupedQueries {
  kuery?: Query[];
  lucene?: Query[];
}

function collectOnlyValidQueries(
  filteredQueries: GroupedQueries,
  operationQueries: GroupedQueries[],
  queryLanguage: 'kuery' | 'lucene'
) {
  return [
    filteredQueries[queryLanguage],
    ...operationQueries.map(({ [queryLanguage]: filter }) => filter),
  ].filter((filters) => filters?.length) as Query[][];
}

export function getFiltersInLayer(
  layer: IndexPatternLayer,
  columnIds: string[],
  layerData: NonNullable<FramePublicAPI['activeData']>[string] | undefined
) {
  const filtersGroupedByState = collectFiltersFromMetrics(layer, columnIds);
  const [enabledFiltersFromMetricsByLanguage, disabledFitleredFromMetricsByLanguage] = (
    ['enabled', 'disabled'] as const
  ).map((state) => groupBy(filtersGroupedByState[state], 'language') as unknown as GroupedQueries);

  const filterOperation = columnIds
    .map((colId) => {
      const column = layer.columns[colId];

      if (isColumnOfType<FiltersIndexPatternColumn>('filters', column)) {
        const groupsByLanguage = groupBy(
          column.params.filters,
          ({ input }) => input.language
        ) as Record<'lucene' | 'kuery', FiltersIndexPatternColumn['params']['filters']>;

        return {
          kuery: extractQueriesFromFilters(groupsByLanguage.kuery),
          lucene: extractQueriesFromFilters(groupsByLanguage.lucene),
        };
      }

      if (isColumnOfType<RangeIndexPatternColumn>('range', column) && column.sourceField) {
        return {
          kuery: extractQueriesFromRanges(column),
        };
      }

      if (
        isColumnOfType<TermsIndexPatternColumn>('terms', column) &&
        !(column.params.otherBucket || column.params.missingBucket)
      ) {
        if (!layerData || shouldUseTermsFallback(layerData, colId)) {
          const fields = operationDefinitionMap[column.operationType]!.getCurrentFields!(column);
          return {
            kuery: fields.map((field) => ({
              query: `${field}: *`,
              language: 'kuery',
            })),
          };
        }

        return {
          kuery: extractQueriesFromTerms(column, colId, layerData),
        };
      }
    })
    .filter(Boolean) as GroupedQueries[];
  return {
    enabled: {
      kuery: collectOnlyValidQueries(enabledFiltersFromMetricsByLanguage, filterOperation, 'kuery'),
      lucene: collectOnlyValidQueries(
        enabledFiltersFromMetricsByLanguage,
        filterOperation,
        'lucene'
      ),
    },
    disabled: {
      kuery: [disabledFitleredFromMetricsByLanguage.kuery || []].filter((filter) => filter.length),
      lucene: [disabledFitleredFromMetricsByLanguage.lucene || []].filter(
        (filter) => filter.length
      ),
    },
  };
}
