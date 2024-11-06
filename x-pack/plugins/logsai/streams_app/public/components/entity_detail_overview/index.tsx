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
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { take, uniqueId } from 'lodash';
import React, { useMemo, useState } from 'react';
import { Entity, entitySourceQuery } from '@kbn/streams-api-plugin/public';
import { EntityTypeDefinition } from '@kbn/streams-api-plugin/common/entities';
import { useKibana } from '../../hooks/use_kibana';
import { getInitialColumnsForLogs } from '../../util/get_initial_columns_for_logs';
import { ControlledEsqlChart } from '../esql_chart/controlled_esql_chart';
import { ControlledEsqlGrid } from '../esql_grid/controlled_esql_grid';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';

export function EntityDetailOverview({
  entity,
  typeDefinition,
  dataStreams,
}: {
  entity: Entity;
  typeDefinition: EntityTypeDefinition;
  dataStreams: Array<{ name: string }>;
}) {
  const {
    dependencies: {
      start: {
        dataViews,
        data,
        streamsAPI: { streamsAPIClient },
      },
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

    const baseDslFilter = entitySourceQuery({
      entity,
    });

    const indexPatterns = queriedDataStreams;

    const baseQuery = `FROM ${indexPatterns.join(', ')}`;

    const logsQuery = `${baseQuery} | LIMIT 100`;

    const histogramQuery = `${baseQuery} | STATS metric = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1 minute)`;

    return {
      logsQuery,
      histogramQuery,
      baseDslFilter: [...baseDslFilter],
    };
  }, [queriedDataStreams, entity]);

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

      return streamsAPIClient.fetch('POST /internal/streams_api/esql', {
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
      });
    },
    [
      queries?.histogramQuery,
      persistedKqlFilter,
      start,
      end,
      queries?.baseDslFilter,
      streamsAPIClient,
    ]
  );

  const columnAnalysis = useMemo(() => {
    if (logsQueryResult.value) {
      return {
        analysis: getInitialColumnsForLogs({
          response: logsQueryResult.value,
          pivots: [typeDefinition.pivot],
        }),
        analysisId: uniqueId(),
      };
    }
    return undefined;
  }, [logsQueryResult, typeDefinition]);

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
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow>
            <StreamsAppSearchBar
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
              placeholder={i18n.translate(
                'xpack.entities.entityDetailOverview.searchBarPlaceholder',
                {
                  defaultMessage: 'Filter data by using KQL',
                }
              )}
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
              data-test-subj="streamsAppEntityDetailOverviewSelect"
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
                          'xpack.entities.entityDetailOverview.allDataStreamsSelected',
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
            <ControlledEsqlChart
              result={histogramQueryFetch}
              id="entity_log_rate"
              metricNames={['metric']}
              height={200}
              chartType={'bar'}
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
                      {i18n.translate('xpack.entities.entityDetailOverview.h3.constantsLabel', {
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
                        {i18n.translate('xpack.entities.entityDetailOverview.moreTextLabel', {
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
