/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
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
import { take, uniqueId } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { Entity, EntityDefinition } from '../../../common/entities';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { useKibana } from '../../hooks/use_kibana';
import { getEntitySourceDslFilter } from '../../util/entities/get_entity_source_dsl_filter';
import { getInitialColumnsForLogs } from '../../util/get_initial_columns_for_logs';
import { ControlledEsqlChart } from '../esql_chart/controlled_esql_chart';
import { ControlledEsqlGrid } from '../esql_grid/controlled_esql_grid';
import { InventorySearchBar } from '../inventory_search_bar';

export function EntityOverview({
  entity,
  typeDefinition,
  allTypeDefinitions,
  dataStreams,
  dataStreamsWithIntegrations,
}: {
  entity: Entity;
  typeDefinition: EntityDefinition;
  allTypeDefinitions: EntityDefinition[];
  dataStreams: Array<{ name: string }>;
  dataStreamsWithIntegrations?: Array<{
    name: string;
    integration?: { name: string };
    dashboards?: unknown[];
  }>;
}) {
  const {
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

    const histogramQuery = `${baseQuery} | STATS count = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1 minute)`;

    return {
      logsQuery,
      histogramQuery,
      baseDslFilter,
    };
  }, [queriedDataStreams, typeDefinition, entity]);

  const logsQueryResult = useEsqlQueryResult({
    query: queries?.logsQuery,
    start,
    end,
    kuery: persistedKqlFilter ?? '',
    dslFilter: queries?.baseDslFilter,
    operationName: 'get_logs_for_entity',
  });

  const histogramQueryResult = useEsqlQueryResult({
    query: queries?.histogramQuery,
    start,
    end,
    kuery: persistedKqlFilter ?? '',
    dslFilter: queries?.baseDslFilter,
    operationName: 'get_histogram_for_entity',
  });

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

  return (
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
              histogramQueryResult.refresh();
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
            isLoading={!dataStreamsWithIntegrations}
            onChange={(next) => {
              setSelectedDataStream(next);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.inventory.entityOverview.logRateChartTitle', {
                defaultMessage: 'Log rate',
              })}
            </h3>
          </EuiTitle>
          <ControlledEsqlChart
            result={histogramQueryResult}
            id="entity_log_rate"
            metricNames={['count']}
            height={200}
            chartType="bar"
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
  );
}
