/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { partition, take, uniqueId } from 'lodash';
import React, { useMemo, useState } from 'react';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { Entity, EntityDefinition } from '../../../common/entities';
import { MetricDefinition } from '../../../common/metrics';
import { getEntitySourceDslFilter } from '../../../common/utils/get_entity_source_dsl_filter';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { useKibana } from '../../hooks/use_kibana';
import { useMetricDefinitions } from '../../hooks/use_metric_definitions';
import { getInitialColumnsForLogs } from '../../util/get_initial_columns_for_logs';
import { ControlledEsqlChart } from '../esql_chart/controlled_esql_chart';
import { ControlledEsqlGrid } from '../esql_grid/controlled_esql_grid';
import { InventorySearchBar } from '../inventory_search_bar';
import { MetricDefinitionFlyout } from '../metric_definition_flyout';

const LOG_RATE_METRIC_DEFINITION: MetricDefinition = {
  filter: '',
  id: '_log_rate',
  displayName: i18n.translate('xpack.inventory.entityOverview.logRateChartTitle', {
    defaultMessage: 'Log rate',
  }),
  properties: {},
};

export function EntityOverview({
  entity,
  typeDefinition,
  allTypeDefinitions,
  dataStreams,
}: {
  entity: Entity;
  typeDefinition: EntityDefinition;
  allTypeDefinitions: EntityDefinition[];
  dataStreams: Array<{ name: string }>;
}) {
  const {
    services: { inventoryAPIClient },
    dependencies: {
      start: { dataViews, data },
    },
  } = useKibana();

  const {
    timeRange,
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const [displayedKqlFilter, setDisplayedKqlFilter] = useState('');
  const [persistedKqlFilter, setPersistedKqlFilter] = useState('');

  const [selectedDataStream, setSelectedDataStream] = useState<string>('');

  const { findMetricDefinitions, bulk } = useMetricDefinitions();

  const [metric, setMetric] = useState<MetricDefinition>(LOG_RATE_METRIC_DEFINITION);

  const queriedDataStreams = useMemo(
    () =>
      selectedDataStream ? [selectedDataStream] : dataStreams.map((dataStream) => dataStream.name),
    [selectedDataStream, dataStreams]
  );

  const queries = useMemo(() => {
    if (!queriedDataStreams.length) {
      return undefined;
    }

    const baseDslFilter = getEntitySourceDslFilter({
      entity,
      identityFields: typeDefinition.identityFields,
    });

    const indexPatterns = queriedDataStreams;

    const baseQuery = `FROM ${indexPatterns.join(', ')}`;

    const logsQuery = `${baseQuery} | LIMIT 100`;

    const histogramQuery = `${baseQuery} | STATS metric = ${
      metric.expression || 'COUNT(*)'
    } BY @timestamp = BUCKET(@timestamp, 1 minute)`;

    return {
      logsQuery,
      histogramQuery,
      baseDslFilter: [...baseDslFilter, ...(metric.filter ? kqlQuery(metric.filter) : [])],
    };
  }, [queriedDataStreams, typeDefinition, entity, metric]);

  const logsQueryResult = useEsqlQueryResult({
    query: queries?.logsQuery,
    start,
    end,
    kuery: persistedKqlFilter ?? '',
    dslFilter: queries?.baseDslFilter,
    operationName: 'get_logs_for_entity',
  });

  const histogramQueryFetch = useAbortableAsync(
    async ({ signal }) => {
      if (!queries?.histogramQuery) {
        return undefined;
      }

      return inventoryAPIClient
        .fetch('POST /internal/inventory/esql', {
          signal,
          params: {
            body: {
              query: queries.histogramQuery,
              kuery: persistedKqlFilter ?? '',
              dslFilter: queries.baseDslFilter,
              operationName: 'get_histogram_for_entity',
              start,
              end,
            },
          },
        })
        .then((response) => {
          return {
            ...response,
            metric,
          };
        });
    },
    [
      metric,
      queries?.histogramQuery,
      persistedKqlFilter,
      start,
      end,
      queries?.baseDslFilter,
      inventoryAPIClient,
    ]
  );

  const columnAnalysis = useMemo(() => {
    if (logsQueryResult.value) {
      return {
        analysis: getInitialColumnsForLogs({
          response: logsQueryResult.value,
          typeDefinitions: allTypeDefinitions.filter(
            (definitionAtIndex) =>
              definitionAtIndex.type !== typeDefinition.type &&
              definitionAtIndex.type !== 'data_stream'
          ),
        }),
        analysisId: uniqueId(),
      };
    }
    return undefined;
  }, [logsQueryResult, allTypeDefinitions, typeDefinition]);

  const dataViewsFetch = useAbortableAsync(() => {
    if (!queriedDataStreams.length) {
      return Promise.resolve([]);
    }

    return dataViews
      .create(
        {
          title: queriedDataStreams.join(','),
          timeFieldName: '@timestamp',
        },
        false, // skip fetch fields
        true // display errors
      )
      .then((response) => {
        return [response];
      });
  }, [dataViews, queriedDataStreams]);

  const fetchedDataViews = useMemo(() => dataViewsFetch.value ?? [], [dataViewsFetch.value]);

  const metricDefinitionsFetch = useAbortableAsync(
    async ({ signal }) => {
      const definitions = await findMetricDefinitions({
        filter: [
          {
            term: {
              'entity.type': entity.type,
            },
          },
          {
            term: {
              'entity.displayName': entity.displayName,
            },
          },
        ],
      });

      return definitions;
    },
    [findMetricDefinitions, entity.type, entity.displayName]
  );

  const metricDefinitionOptions = useMemo(() => {
    return [LOG_RATE_METRIC_DEFINITION, ...(metricDefinitionsFetch.value ?? [])].map(
      (definition) => ({
        value: definition.id,
        dropdownDisplay: definition.displayName,
        inputDisplay: <>{definition.displayName}</>,
      })
    );
  }, [metricDefinitionsFetch.value]);

  const [isMetricFlyoutOpen, setIsMetricFlyoutOpen] = useState(false);

  const indexPatterns = useMemo(() => {
    return dataStreams.map((ds) => ds.name);
  }, [dataStreams]);

  return (
    <>
      {isMetricFlyoutOpen ? (
        <MetricDefinitionFlyout
          metricDefinitions={metricDefinitionsFetch.value!}
          onClose={() => {
            setIsMetricFlyoutOpen(false);
          }}
          indexPatterns={indexPatterns}
          onMetricDefinitionsUpdate={async (nextDefinitions) => {
            const existingIds = new Set(metricDefinitionsFetch.value?.map((def) => def.id));
            const nextIds = new Set(nextDefinitions.map((def) => def.id));

            const [toUpdate, toCreate] = partition(nextDefinitions, (definition) =>
              existingIds.has(definition.id)
            );
            const toDelete = Array.from(existingIds).filter((id) => !nextIds.has(id));

            const properties = {
              'entity.displayName': entity.displayName,
              'entity.type': entity.type,
            };

            await bulk([
              ...toUpdate.map((update) => ({
                update,
                id: update.id,
                properties: { ...update.properties, ...properties },
              })),
              ...toCreate.map((create) => ({
                create: {
                  ...create,
                  properties,
                },
              })),
              ...toDelete.map((id) => ({ delete: {}, id })),
            ]);

            setIsMetricFlyoutOpen(false);
          }}
          displayName={entity.displayName}
          type={entity.type}
        />
      ) : null}
      <EuiFlexGroup direction="column">
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow>
            <InventorySearchBar
              query={displayedKqlFilter}
              onQueryChange={({ query }) => {
                setDisplayedKqlFilter(query);
              }}
              onQuerySubmit={() => {
                setPersistedKqlFilter(displayedKqlFilter);
              }}
              onRefresh={() => {
                logsQueryResult.refresh();
                histogramQueryFetch.refresh();
              }}
              placeholder={i18n.translate('xpack.inventory.entityOverview.searchBarPlaceholder', {
                defaultMessage: 'Filter data by using KQL',
              })}
              dataViews={fetchedDataViews}
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            className={css`
              width: 240px;
            `}
          >
            <EuiSuperSelect
              data-test-subj="inventoryEntityOverviewSelect"
              itemClassName={css`
                white-space: nowrap;
                display: inline-block;
                text-overflow: ellipsis;
                overflow: hidden;
                margin-left: 4px;
              `}
              options={[
                ...(!dataStreams.length
                  ? []
                  : [
                      {
                        value: '',
                        inputDisplay: i18n.translate(
                          'xpack.inventory.entityOverview.allDataStreamsSelected',
                          {
                            defaultMessage:
                              '{count,plural, one {# data stream} other {All # data streams}}',
                            values: {
                              count: dataStreams.length,
                            },
                          }
                        ),
                      },
                    ]),
                ...(dataStreams.map((dataStream) => ({
                  value: dataStream.name,
                  inputDisplay: dataStream.name,
                })) ?? []),
              ]}
              valueOfSelected={selectedDataStream}
              onChange={(next) => {
                setSelectedDataStream(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiPanel hasShadow={false} hasBorder>
          <EuiFlexGroup direction="column">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiSuperSelect
                options={metricDefinitionOptions}
                valueOfSelected={metric.id}
                itemClassName={css`
                  white-space: nowrap;
                  display: inline-block;
                  text-overflow: ellipsis;
                  overflow: hidden;
                  margin-left: 4px;
                `}
                className={css`
                  width: 192px;
                `}
                onChange={(next) => {
                  setMetric(
                    metricDefinitionsFetch.value?.find((definition) => definition.id === next) ??
                      LOG_RATE_METRIC_DEFINITION
                  );
                }}
              />
              <EuiButtonEmpty
                data-test-subj="inventoryEntityOverviewButton"
                onClick={() => {
                  setIsMetricFlyoutOpen(true);
                }}
                color="text"
                iconType="singleMetricViewer"
              >
                {i18n.translate(
                  'xpack.inventory.entityOverview.manageMetricDefinitionsButtonLabel',
                  { defaultMessage: 'Manage metric definitions' }
                )}
              </EuiButtonEmpty>
            </EuiFlexGroup>
            <ControlledEsqlChart
              result={histogramQueryFetch}
              id="entity_log_rate"
              metricNames={['metric']}
              height={200}
              chartType={
                !histogramQueryFetch.value?.metric.expression ||
                histogramQueryFetch.value.metric.expression.includes('COUNT(')
                  ? 'bar'
                  : 'line'
              }
            />
          </EuiFlexGroup>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder>
          <EuiFlexGroup direction="column">
            {columnAnalysis?.analysis.constants.length ? (
              <>
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate('xpack.inventory.entityOverview.h3.constantsLabel', {
                        defaultMessage: 'Constants',
                      })}
                    </h3>
                  </EuiTitle>
                  <EuiFlexGroup direction="row" wrap gutterSize="xs">
                    {take(columnAnalysis.analysis.constants, 10).map((constant) => (
                      <EuiBadge color="hollow" key={constant.name}>{`${constant.name}:${
                        constant.value === '' || constant.value === 0 ? '(empty)' : constant.value
                      }`}</EuiBadge>
                    ))}
                    {columnAnalysis.analysis.constants.length > 10 ? (
                      <EuiText size="xs">
                        {i18n.translate('xpack.inventory.entityOverview.moreTextLabel', {
                          defaultMessage: '{overflowCount} more',
                          values: {
                            overflowCount: columnAnalysis.analysis.constants.length - 20,
                          },
                        })}
                      </EuiText>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexGroup>
              </>
            ) : null}
            {queries?.logsQuery ? (
              <ControlledEsqlGrid
                analysisId={columnAnalysis?.analysisId}
                query={queries?.logsQuery}
                result={logsQueryResult}
                initialColumns={columnAnalysis?.analysis.initialColumns}
              />
            ) : null}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexGroup>
    </>
  );
}
