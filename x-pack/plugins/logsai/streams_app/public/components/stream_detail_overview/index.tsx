/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { calculateAuto } from '@kbn/calculate-auto';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import { entitySourceQuery } from '../../../common/entity_source_query';
import { useKibana } from '../../hooks/use_kibana';
import { ControlledEsqlChart } from '../esql_chart/controlled_esql_chart';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';

export function StreamDetailOverview({ definition }: { definition?: StreamDefinition }) {
  const {
    dependencies: {
      start: {
        data,
        dataViews,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const {
    timeRange,
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const [displayedKqlFilter, setDisplayedKqlFilter] = useState('');
  const [persistedKqlFilter, setPersistedKqlFilter] = useState('');

  const dataStream = definition?.id;

  const queries = useMemo(() => {
    if (!dataStream) {
      return undefined;
    }

    const baseDslFilter = entitySourceQuery({
      entity: {
        _index: dataStream,
      },
    });

    const indexPatterns = [dataStream];

    const baseQuery = `FROM ${indexPatterns.join(', ')}`;

    const bucketSize = Math.round(
      calculateAuto.atLeast(50, moment.duration(1, 'minute'))!.asSeconds()
    );

    const histogramQuery = `${baseQuery} | STATS metric = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${bucketSize} seconds)`;

    return {
      histogramQuery,
      baseDslFilter,
    };
  }, [dataStream]);

  const histogramQueryFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!queries?.histogramQuery || !dataStream) {
        return undefined;
      }

      const existingIndices = await dataViews.getExistingIndices([dataStream]);

      if (existingIndices.length === 0) {
        return undefined;
      }

      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_histogram_for_stream',
            query: queries.histogramQuery,
            filter: queries.baseDslFilter,
            kuery: persistedKqlFilter,
            start,
            end,
          },
        },
        signal,
      });
    },
    [
      dataStream,
      dataViews,
      streamsRepositoryClient,
      queries?.histogramQuery,
      persistedKqlFilter,
      start,
      end,
      queries?.baseDslFilter,
    ]
  );

  const dataViewsFetch = useAbortableAsync(() => {
    return dataViews
      .create(
        {
          title: dataStream,
          timeFieldName: '@timestamp',
        },
        false, // skip fetch fields
        true // display errors
      )
      .then((response) => {
        return [response];
      });
  }, [dataViews, dataStream]);

  const fetchedDataViews = useMemo(() => dataViewsFetch.value ?? [], [dataViewsFetch.value]);

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow>
            <StreamsAppSearchBar
              query={displayedKqlFilter}
              onQueryChange={({ query: nextQuery }) => {
                setDisplayedKqlFilter(nextQuery);
              }}
              onQuerySubmit={() => {
                setPersistedKqlFilter(displayedKqlFilter);
              }}
              onRefresh={() => {
                histogramQueryFetch.refresh();
              }}
              placeholder={i18n.translate(
                'xpack.streams.entityDetailOverview.searchBarPlaceholder',
                {
                  defaultMessage: 'Filter data by using KQL',
                }
              )}
              dataViews={fetchedDataViews}
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
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
      </EuiFlexGroup>
    </>
  );
}
