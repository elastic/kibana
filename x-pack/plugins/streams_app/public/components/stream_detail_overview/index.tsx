/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { calculateAuto } from '@kbn/calculate-auto';
import { i18n } from '@kbn/i18n';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import moment from 'moment';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { ControlledEsqlChart } from '../esql_chart/controlled_esql_chart';
import { StreamsAppSearchBar } from '../streams_app_search_bar';

export function StreamDetailOverview({ definition }: { definition?: StreamDefinition }) {
  const {
    dependencies: {
      start: {
        data,
        dataViews,
        streams: { streamsRepositoryClient },
        share,
      },
    },
  } = useKibana();

  const {
    timeRange,
    absoluteTimeRange: { start, end },
    setTimeRange,
  } = useDateRange({ data });

  const indexPatterns = useMemo(() => {
    if (!definition?.id) {
      return undefined;
    }

    const isRoot = definition.id.indexOf('.') === -1;

    const dataStreamOfDefinition = definition.id;

    return isRoot
      ? [dataStreamOfDefinition, `${dataStreamOfDefinition}.*`]
      : [`${dataStreamOfDefinition}*`];
  }, [definition?.id]);

  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const queries = useMemo(() => {
    if (!indexPatterns) {
      return undefined;
    }

    const baseQuery = `FROM ${indexPatterns.join(', ')}`;

    const bucketSize = Math.round(
      calculateAuto.atLeast(50, moment.duration(1, 'minute'))!.asSeconds()
    );

    const histogramQuery = `${baseQuery} | STATS metric = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${bucketSize} seconds)`;

    return {
      baseQuery,
      histogramQuery,
    };
  }, [indexPatterns]);

  const discoverLink = useMemo(() => {
    if (!discoverLocator || !queries?.baseQuery) {
      return undefined;
    }

    return discoverLocator.getRedirectUrl({
      query: {
        esql: queries.baseQuery,
      },
    });
  }, [queries?.baseQuery, discoverLocator]);

  const histogramQueryFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!queries?.histogramQuery || !indexPatterns) {
        return undefined;
      }

      const existingIndices = await dataViews.getExistingIndices(indexPatterns);

      if (existingIndices.length === 0) {
        return undefined;
      }

      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_histogram_for_stream',
            query: queries.histogramQuery,
            start,
            end,
          },
        },
        signal,
      });
    },
    [indexPatterns, dataViews, streamsRepositoryClient, queries?.histogramQuery, start, end]
  );

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow>
            <StreamsAppSearchBar
              onQuerySubmit={({ dateRange }, isUpdate) => {
                if (!isUpdate) {
                  histogramQueryFetch.refresh();
                  return;
                }

                if (dateRange) {
                  setTimeRange({ from: dateRange.from, to: dateRange?.to, mode: dateRange.mode });
                }
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
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
            />
          </EuiFlexItem>
          <EuiButton
            data-test-subj="streamsDetailOverviewOpenInDiscoverButton"
            iconType="discoverApp"
            href={discoverLink}
            color="text"
          >
            {i18n.translate('xpack.streams.streamDetailOverview.openInDiscoverButtonLabel', {
              defaultMessage: 'Open in Discover',
            })}
          </EuiButton>
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
