/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinksStart, ThemeServiceStart } from '@kbn/core/public';
import { hasUnsupportedDownsampledAggregationFailure } from '@kbn/search-response-warnings';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { EuiLink, EuiSpacer } from '@elastic/eui';

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { groupBy, escape, uniq, uniqBy } from 'lodash';
import type { Query } from '@kbn/data-plugin/common';

import {
  type SearchResponseWarning,
  SearchResponseWarningsBadgePopoverContent,
} from '@kbn/search-response-warnings';

import { estypes } from '@elastic/elasticsearch';
import { isQueryValid } from '@kbn/visualization-ui-components';
import type { DateRange } from '../../../common/types';
import type {
  FramePublicAPI,
  IndexPattern,
  StateSetter,
  UserMessage,
  VisualizationInfo,
} from '../../types';
import { renewIDs } from '../../utils';
import type { FormBasedLayer, FormBasedPersistedState, FormBasedPrivateState } from './types';
import type { ReferenceBasedIndexPatternColumn } from './operations/definitions/column_types';

import {
  operationDefinitionMap,
  getReferenceRoot,
  updateColumnParam,
  updateDefaultLabels,
  type GenericIndexPatternColumn,
  type TermsIndexPatternColumn,
  type CountIndexPatternColumn,
  type RangeIndexPatternColumn,
  type FormulaIndexPatternColumn,
  type DateHistogramIndexPatternColumn,
  type MaxIndexPatternColumn,
  type MinIndexPatternColumn,
  type GenericOperationDefinition,
  type FieldBasedIndexPatternColumn,
} from './operations';

import { getInvalidFieldMessage, isColumnOfType } from './operations/definitions/helpers';
import { FiltersIndexPatternColumn } from './operations/definitions/filters';
import { hasField } from './pure_utils';
import { mergeLayer } from './state_helpers';
import { supportsRarityRanking } from './operations/definitions/terms';
import { DEFAULT_MAX_DOC_COUNT } from './operations/definitions/terms/constants';
import { getOriginalId } from '../../../common/expressions/datatable/transpose_helpers';
import { ReducedSamplingSectionEntries } from './info_badges';
import { IgnoredGlobalFiltersEntries } from '../../shared_components/ignore_global_filter';
import {
  INCOMPLETE_ES_RESULTS,
  LAYER_SETTINGS_IGNORE_GLOBAL_FILTERS,
  LAYER_SETTINGS_RANDOM_SAMPLING_INFO,
  PRECISION_ERROR_ACCURACY_MODE_DISABLED,
  PRECISION_ERROR_ACCURACY_MODE_ENABLED,
  PRECISION_ERROR_ASC_COUNT_PRECISION,
  TSDB_UNSUPPORTED_COUNTER_OP,
  UNSUPPORTED_DOWNSAMPLED_INDEX_AGG_PREFIX,
} from '../../user_messages_ids';

function isMinOrMaxColumn(
  column?: GenericIndexPatternColumn
): column is MaxIndexPatternColumn | MinIndexPatternColumn {
  if (!column) {
    return false;
  }
  return (
    isColumnOfType<MaxIndexPatternColumn>('max', column) ||
    isColumnOfType<MinIndexPatternColumn>('min', column)
  );
}

function isReferenceColumn(
  column: GenericIndexPatternColumn
): column is ReferenceBasedIndexPatternColumn {
  return 'references' in column;
}

export function isSamplingValueEnabled(layer: FormBasedLayer) {
  // Do not use columnOrder here as it needs to check also inside formulas columns
  return !Object.values(layer.columns).some(
    (column) =>
      isMinOrMaxColumn(column) ||
      (isReferenceColumn(column) && isMinOrMaxColumn(layer.columns[column.references[0]]))
  );
}

/**
 * Centralized logic to get the actual random sampling value for a layer
 * @param layer
 * @returns
 */
export function getSamplingValue(layer: FormBasedLayer) {
  return isSamplingValueEnabled(layer) ? layer.sampling ?? 1 : 1;
}

export function isColumnInvalid(
  layer: FormBasedLayer,
  column: GenericIndexPatternColumn,
  columnId: string,
  indexPattern: IndexPattern,
  dateRange: DateRange,
  targetBars: number
): boolean {
  // check also references for errors
  const referencesHaveErrors =
    'references' in column &&
    hasReferencesErrors(layer, column, indexPattern, dateRange, targetBars);

  const operationHasErrorMessages =
    (
      operationDefinitionMap[column.operationType]?.getErrorMessage?.(
        layer,
        columnId,
        indexPattern,
        dateRange,
        operationDefinitionMap,
        targetBars
      ) ?? []
    ).length > 0;

  // it looks like this is just a back-stop since we prevent
  // invalid filters from being set at the UI level
  const filterHasError = column.filter ? !isQueryValid(column.filter, indexPattern) : false;
  return operationHasErrorMessages || referencesHaveErrors || filterHasError;
}

function hasReferencesErrors(
  layer: FormBasedLayer,
  column: ReferenceBasedIndexPatternColumn,
  indexPattern: IndexPattern,
  dateRange: DateRange,
  targetBars: number
) {
  return column.references?.some((referenceId: string) => {
    const referencedOperation = layer.columns[referenceId]?.operationType;
    const referencedDefinition = operationDefinitionMap[referencedOperation];
    return (
      (
        referencedDefinition?.getErrorMessage?.(
          layer,
          referenceId,
          indexPattern,
          dateRange,
          operationDefinitionMap,
          targetBars
        ) ?? []
      ).length > 0
    );
  });
}

export function fieldIsInvalid(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern: IndexPattern
) {
  const column = layer.columns[columnId];

  if (!column || !hasField(column)) {
    return false;
  }
  return getInvalidFieldMessage(layer, columnId, indexPattern).length > 0;
}

const accuracyModeDisabledWarning = (
  columnName: string,
  columnId: string,
  enableAccuracyMode: () => void
): UserMessage => ({
  uniqueId: PRECISION_ERROR_ACCURACY_MODE_DISABLED,
  severity: 'warning',
  displayLocations: [{ id: 'toolbar' }, { id: 'dimensionButton', dimensionId: columnId }],
  fixableInEditor: true,
  shortMessage: i18n.translate(
    'xpack.lens.indexPattern.precisionErrorWarning.accuracyDisabled.shortMessage',
    {
      defaultMessage:
        'This might be an approximation. For more precise results, you can enable accuracy mode, but it increases the load on the Elasticsearch cluster.',
    }
  ),
  longMessage: (
    <>
      <FormattedMessage
        id="xpack.lens.indexPattern.precisionErrorWarning.accuracyDisabled"
        defaultMessage="{name} might be an approximation. You can enable accuracy mode for more precise results, but note that it increases the load on the Elasticsearch cluster."
        values={{
          name: <strong>{columnName}</strong>,
        }}
      />
      <EuiSpacer size="s" />
      <EuiLink data-test-subj="lnsPrecisionWarningEnableAccuracy" onClick={enableAccuracyMode}>
        {i18n.translate('xpack.lens.indexPattern.enableAccuracyMode', {
          defaultMessage: 'Enable accuracy mode',
        })}
      </EuiLink>
    </>
  ),
});

const accuracyModeEnabledWarning = (
  columnName: string,
  columnId: string,
  docLink: string
): UserMessage => ({
  uniqueId: PRECISION_ERROR_ACCURACY_MODE_ENABLED,
  severity: 'warning',
  displayLocations: [{ id: 'toolbar' }, { id: 'dimensionButton', dimensionId: columnId }],
  fixableInEditor: true,
  shortMessage: i18n.translate(
    'xpack.lens.indexPattern.precisionErrorWarning.accuracyEnabled.shortMessage',
    {
      defaultMessage:
        'This might be an approximation. For more precise results, use Filters or increase the number of Top Values.',
    }
  ),
  longMessage: (
    <FormattedMessage
      id="xpack.lens.indexPattern.precisionErrorWarning.accuracyEnabled"
      defaultMessage="{name} might be an approximation. For more precise results, try increasing the number of {topValues} or using {filters} instead. {learnMoreLink}"
      values={{
        name: <strong>{columnName}</strong>,
        topValues: (
          <strong>
            <FormattedMessage
              id="xpack.lens.indexPattern.precisionErrorWarning.topValues"
              defaultMessage="Top Values"
            />
          </strong>
        ),
        filters: (
          <strong>
            <FormattedMessage
              id="xpack.lens.indexPattern.precisionErrorWarning.filters"
              defaultMessage="Filters"
            />
          </strong>
        ),
        learnMoreLink: (
          <EuiLink href={docLink} target="_blank" external={true}>
            <FormattedMessage
              defaultMessage="Learn more."
              id="xpack.lens.indexPattern.precisionErrorWarning.link"
            />
          </EuiLink>
        ),
      }}
    />
  ),
});

export function getSearchWarningMessages(
  state: FormBasedPersistedState,
  warning: SearchResponseWarning,
  request: estypes.SearchRequest,
  response: estypes.SearchResponse,
  theme: ThemeServiceStart
): UserMessage[] {
  if (state) {
    if (warning.type === 'incomplete') {
      return hasUnsupportedDownsampledAggregationFailure(warning)
        ? Object.values(state.layers).flatMap((layer) =>
            uniq(
              Object.values(layer.columns)
                .filter((col) =>
                  [
                    'median',
                    'percentile',
                    'percentile_rank',
                    'last_value',
                    'unique_count',
                    'standard_deviation',
                  ].includes(col.operationType)
                )
                .map((col) => col.label)
            ).map((label) => ({
              // TODO: we probably need to move label as part of the meta data
              uniqueId: `${UNSUPPORTED_DOWNSAMPLED_INDEX_AGG_PREFIX}--${label}`,
              severity: 'warning',
              fixableInEditor: true,
              displayLocations: [{ id: 'toolbar' }, { id: 'embeddableBadge' }],
              shortMessage: '',
              longMessage: i18n.translate('xpack.lens.indexPattern.tsdbRollupWarning', {
                defaultMessage:
                  '{label} uses a function that is unsupported by rolled up data. Select a different function or change the time range.',
                values: {
                  label,
                },
              }),
            }))
          )
        : [
            {
              uniqueId: INCOMPLETE_ES_RESULTS,
              severity: 'warning',
              fixableInEditor: true,
              displayLocations: [{ id: 'toolbar' }, { id: 'embeddableBadge' }],
              shortMessage: '',
              longMessage: (closePopover) => (
                <SearchResponseWarningsBadgePopoverContent
                  onViewDetailsClick={closePopover}
                  warnings={[warning]}
                />
              ),
            },
          ];
    }
  }
  return [];
}

export function getUnsupportedOperationsWarningMessage(
  state: FormBasedPrivateState,
  { dataViews }: FramePublicAPI,
  docLinks: DocLinksStart
) {
  const warningMessages: UserMessage[] = [];
  const columnsWithUnsupportedOperations: Array<
    [FieldBasedIndexPatternColumn, ReferenceBasedIndexPatternColumn | undefined]
  > = Object.values(state.layers)
    // filter layers without dataView loaded yet
    .filter(({ indexPatternId }) => dataViews.indexPatterns[indexPatternId])
    .flatMap((layer) => {
      const dataView = dataViews.indexPatterns[layer.indexPatternId];
      const columnsEntries = Object.entries(layer.columns);
      return columnsEntries
        .filter(([_, column]) => {
          const operation = operationDefinitionMap[column.operationType] as Extract<
            GenericOperationDefinition,
            { input: 'field' }
          >;

          // this check for getPossibleOperationForField is needed as long as
          // https://github.com/elastic/kibana/issues/168561 is unresolved
          if (!operation.getPossibleOperationForField || !hasField(column)) {
            return false;
          }

          const field = dataView.getFieldByName(column.sourceField);
          if (!field) {
            return false;
          }
          return (
            !operation.getPossibleOperationForField?.(field) &&
            field?.timeSeriesMetric === 'counter'
          );
        })
        .map(
          ([id, fieldColumn]) =>
            [fieldColumn, layer.columns[getReferenceRoot(layer, id)]] as [
              FieldBasedIndexPatternColumn,
              ReferenceBasedIndexPatternColumn | undefined
            ]
        );
    });
  if (columnsWithUnsupportedOperations.length) {
    // group the columns by field
    // then group together columns of a formula/referenced operation who use the same field
    const columnsGroupedByField = Object.values(
      groupBy(columnsWithUnsupportedOperations, ([column]) => column.sourceField)
    ).map((columnsList) => uniqBy(columnsList, ([column, rootColumn]) => rootColumn ?? column));

    for (const columnsGrouped of columnsGroupedByField) {
      const sourceField = columnsGrouped[0][0].sourceField;
      warningMessages.push({
        uniqueId: TSDB_UNSUPPORTED_COUNTER_OP,
        severity: 'warning',
        fixableInEditor: false,
        displayLocations: [{ id: 'toolbar' }, { id: 'embeddableBadge' }],
        shortMessage: i18n.translate(
          'xpack.lens.indexPattern.tsdbErrorWarning.unsupportedCounterOperationErrorWarning.shortMessage',
          {
            defaultMessage:
              'The result of {count} {count, plural, one {operation} other {operations}} might be meaningless for {field}: {operations}',
            values: {
              count: columnsGrouped.length,
              operations: columnsGrouped
                .map(([affectedColumn, rootColumn]) => (rootColumn ?? affectedColumn).label)
                .join(', '),
              field: sourceField,
            },
          }
        ),
        longMessage: (
          <>
            <FormattedMessage
              id="xpack.lens.indexPattern.unsupportedCounterOperationErrorWarning"
              defaultMessage="While {count} {count, plural, one {operation} other {operations}} for {field} {count, plural, one {is} other {are}} allowed the result might be meaningless: {operations}. To learn more about this, {link}."
              values={{
                count: columnsGrouped.length,
                operations: (
                  <>
                    {columnsGrouped.map(([affectedColumn, rootColumn], i) => (
                      <React.Fragment key={(rootColumn ?? affectedColumn).label}>
                        <strong>{(rootColumn ?? affectedColumn).label}</strong>
                        {i < columnsGrouped.length - 1 ? ', ' : ''}
                      </React.Fragment>
                    ))}
                  </>
                ),
                field: sourceField,
                link: (
                  <EuiLink
                    href={docLinks.links.fleet.datastreamsTSDSMetrics}
                    target="_blank"
                    external={true}
                  >
                    <FormattedMessage
                      defaultMessage="visit the Time series documentation"
                      id="xpack.lens.indexPattern.unsupportedCounterOperationErrorWarning.link"
                    />
                  </EuiLink>
                ),
              }}
            />
          </>
        ),
      });
    }
  }
  return warningMessages;
}

export function getPrecisionErrorWarningMessages(
  datatableUtilities: DatatableUtilitiesService,
  state: FormBasedPrivateState,
  { activeData, dataViews }: FramePublicAPI,
  docLinks: DocLinksStart,
  setState: StateSetter<FormBasedPrivateState>
) {
  const warningMessages: UserMessage[] = [];

  if (state && activeData) {
    Object.entries(activeData)
      .reduce((acc, [layerId, { columns }]) => {
        acc.push(...columns.map((column) => ({ layerId, column })));
        return acc;
      }, [] as Array<{ layerId: string; column: DatatableColumn }>)
      .forEach(({ layerId, column }) => {
        const currentLayer = state.layers[layerId];
        const currentColumn = currentLayer?.columns[column.id];
        if (currentLayer && currentColumn && datatableUtilities.hasPrecisionError(column)) {
          const indexPattern = dataViews.indexPatterns[currentLayer.indexPatternId];
          if (!indexPattern) {
            return;
          }
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
                ? accuracyModeEnabledWarning(
                    column.name,
                    column.id,
                    docLinks.links.aggs.terms_doc_count_error
                  )
                : accuracyModeDisabledWarning(column.name, column.id, () => {
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
                  })
            );
          } else {
            warningMessages.push({
              uniqueId: PRECISION_ERROR_ASC_COUNT_PRECISION,
              severity: 'warning',
              displayLocations: [
                { id: 'toolbar' },
                { id: 'dimensionButton', dimensionId: column.id },
              ],
              shortMessage: i18n.translate(
                'xpack.lens.indexPattern.precisionErrorWarning.ascendingCountPrecisionErrorWarning.shortMessage',
                {
                  defaultMessage:
                    'This may be approximate depending on how the data is indexed. For more precise results, sort by rarity.',
                }
              ),
              longMessage: (
                <>
                  <FormattedMessage
                    id="xpack.lens.indexPattern.ascendingCountPrecisionErrorWarning"
                    defaultMessage="{name} for this visualization may be approximate due to how the data is indexed. Try sorting by rarity instead of ascending count of records. To learn more about this limit, {link}."
                    values={{
                      name: <strong>{column.name}</strong>,
                      link: (
                        <EuiLink
                          href={docLinks.links.aggs.rare_terms}
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
                  <EuiLink
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
                  </EuiLink>
                </>
              ),
              fixableInEditor: true,
            });
          }
        }
      });
  }

  return warningMessages;
}

export function getVisualDefaultsForLayer(layer: FormBasedLayer) {
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

export function getNotifiableFeatures(
  state: FormBasedPrivateState,
  frame: FramePublicAPI,
  visualizationInfo?: VisualizationInfo
): UserMessage[] {
  if (!visualizationInfo) {
    return [];
  }
  const features: UserMessage[] = [];
  const layers = Object.entries(state.layers);
  const layersWithCustomSamplingValues = layers.filter(
    ([, layer]) => getSamplingValue(layer) !== 1
  );
  if (layersWithCustomSamplingValues.length) {
    features.push({
      uniqueId: LAYER_SETTINGS_RANDOM_SAMPLING_INFO,
      severity: 'info',
      fixableInEditor: false,
      shortMessage: i18n.translate('xpack.lens.indexPattern.samplingPerLayer', {
        defaultMessage: 'Sampling probability by layer',
      }),
      longMessage: (
        <ReducedSamplingSectionEntries
          layers={layersWithCustomSamplingValues}
          dataViews={frame.dataViews}
          visualizationInfo={visualizationInfo}
        />
      ),
      displayLocations: [{ id: 'embeddableBadge' }],
    });
  }
  const layersWithIgnoreGlobalFilters = layers.filter(([, layer]) => layer.ignoreGlobalFilters);
  if (layersWithIgnoreGlobalFilters.length) {
    features.push({
      uniqueId: LAYER_SETTINGS_IGNORE_GLOBAL_FILTERS,
      severity: 'info',
      fixableInEditor: false,
      shortMessage: i18n.translate('xpack.lens.xyChart.layerAnnotationsIgnoreTitle', {
        defaultMessage: 'Layers ignoring global filters',
      }),
      longMessage: (
        <IgnoredGlobalFiltersEntries
          layers={layersWithIgnoreGlobalFilters.map(([layerId, { indexPatternId }]) => ({
            layerId,
            indexPatternId,
          }))}
          visualizationInfo={visualizationInfo}
          dataViews={frame.dataViews}
        />
      ),
      displayLocations: [{ id: 'embeddableBadge' }],
    });
  }

  return features;
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
 * If the data view doesn't have a default time field, Discover can't use the global time range - construct an equivalent filter instead
 */
function extractTimeRangeFromDateHistogram(
  column: DateHistogramIndexPatternColumn,
  timeRange: TimeRange
) {
  return [
    {
      language: 'kuery',
      query: `"${column.sourceField}" >= "${timeRange.from}" AND "${column.sourceField}" <= "${timeRange.to}"`,
    },
  ];
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
function collectFiltersFromMetrics(layer: FormBasedLayer, columnIds: string[]) {
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
  layer: FormBasedLayer,
  columnIds: string[],
  layerData: NonNullable<FramePublicAPI['activeData']>[string] | undefined,
  indexPattern: IndexPattern,
  timeRange: TimeRange | undefined
) {
  const filtersGroupedByState = collectFiltersFromMetrics(layer, columnIds);
  const [enabledFiltersFromMetricsByLanguage, disabledFitleredFromMetricsByLanguage] = (
    ['enabled', 'disabled'] as const
  ).map((state) => groupBy(filtersGroupedByState[state], 'language') as unknown as GroupedQueries);

  const filterOperationsOrErrors = columnIds
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
        isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column) &&
        timeRange &&
        column.sourceField &&
        !column.params.ignoreTimeRange &&
        indexPattern.timeFieldName !== column.sourceField
      ) {
        if (indexPattern.timeFieldName) {
          // non-default time field is not supported in Discover if data view has a time field
          return {
            error: i18n.translate('xpack.lens.indexPattern.nonDefaultTimeFieldError', {
              defaultMessage:
                '"Explore data in Discover" does not support date histograms on non-default time fields if time field is set on the data view',
            }),
          };
        }
        // if the data view has no default time field but the date histograms' time field is bound to the time range, create a KQL query for the time range
        return {
          kuery: extractTimeRangeFromDateHistogram(column, timeRange),
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
              query: `"${field}": *`,
              language: 'kuery',
            })),
          };
        }

        return {
          kuery: extractQueriesFromTerms(column, colId, layerData),
        };
      }
    })
    .filter(Boolean);

  const errors = filterOperationsOrErrors.filter((filter) => filter && 'error' in filter) as Array<{
    error: string;
  }>;

  if (errors.length) {
    return {
      error: errors.map(({ error }) => error).join(', '),
    };
  }

  const filterOperations = filterOperationsOrErrors as GroupedQueries[];

  return {
    enabled: {
      kuery: collectOnlyValidQueries(
        enabledFiltersFromMetricsByLanguage,
        filterOperations,
        'kuery'
      ),
      lucene: collectOnlyValidQueries(
        enabledFiltersFromMetricsByLanguage,
        filterOperations,
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

export const cloneLayer = (
  layers: Record<string, FormBasedLayer>,
  layerId: string,
  newLayerId: string,
  getNewId: (id: string) => string
) => {
  if (layers[layerId]) {
    return {
      ...layers,
      [newLayerId]: renewIDs(
        layers[layerId],
        Object.keys(layers[layerId]?.columns ?? {}),
        getNewId
      ),
    };
  }
  return layers;
};
