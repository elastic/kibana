/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { orderBy } from 'lodash';
import React, { useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NodeType, getNodeName } from '../../../../../common/connections';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { DependenciesItem } from '../../../shared/dependencies_table';
import {
  DependenciesTable,
  INITIAL_SORTING_FIELD,
  INITIAL_SORTING_DIRECTION,
} from '../../../shared/dependencies_table';
import { DependencyLink } from '../../../shared/links/dependency_link';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { RandomSamplerBadge } from '../random_sampler_badge';

const INITIAL_PAGE_SIZE = 25;

export function DependenciesInventoryTable() {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      comparisonEnabled,
      offset,
      page = 0,
      pageSize = INITIAL_PAGE_SIZE,
      sortDirection = INITIAL_SORTING_DIRECTION,
      sortField = INITIAL_SORTING_FIELD,
    },
  } = useApmParams('/dependencies/inventory');
  const { onPageReady } = usePerformanceContext();
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { euiTheme } = useEuiTheme();
  const trackEvent = useUiTracker();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi('GET /internal/apm/dependencies/top_dependencies', {
        params: { query: { start, end, environment, numBuckets: 8, kuery } },
      }).then((response) => {
        return {
          ...response,
          requestId: uuidv4(),
        };
      });
    },
    [start, end, environment, kuery]
  );

  const visibleDependenciesNames = useMemo(
    () =>
      data?.dependencies
        ? orderBy(
          data.dependencies.map((item) => ({
            name: getNodeName(item.location),
            impact: item.currentStats.impact,
            latency: item.currentStats.latency.value,
            throughput: item.currentStats.throughput.value,
            failureRate: item.currentStats.errorRate.value,
          })),
          sortField,
          sortDirection
        )
          .slice(page * pageSize, (page + 1) * pageSize)
          .map(({ name }) => name)
          .sort()
        : undefined,
    [data?.dependencies, page, pageSize, sortDirection, sortField]
  );

  const { data: timeseriesData, status: timeseriesStatus } = useFetcher(
    (callApmApi) => {
      if (data?.requestId && visibleDependenciesNames?.length) {
        return callApmApi('POST /internal/apm/dependencies/top_dependencies/statistics', {
          params: {
            query: {
              start,
              end,
              environment,
              numBuckets: 8,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              kuery,
            },
            body: {
              dependencyNames: JSON.stringify(visibleDependenciesNames),
            },
          },
        });
      }
    },
    // Disables exhaustive deps because the statistics api must only be called when the rendered items changed or when comparison is toggled or changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.requestId, visibleDependenciesNames, comparisonEnabled, offset],
    // Do not invalidate this API call when the refresh button is clicked
    { skipTimeRangeRefreshUpdate: true }
  );

  useEffect(() => {
    if (status === FETCH_STATUS.SUCCESS) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
          description:
            '[ttfmp_dependencies] Dependencies table is ready after fetching top_dependencies.',
        },
      });
    }
  }, [status, onPageReady, rangeFrom, rangeTo]);

  const dependencies: DependenciesItem[] = useMemo(
    () =>
      data?.dependencies.map((dependency) => {
        const { location } = dependency;
        const name = getNodeName(location);

        if (location.type !== NodeType.dependency) {
          throw new Error('Expected a dependency node');
        }
        const link = (
          <DependencyLink
            type={location.spanType}
            subtype={location.spanSubtype}
            query={{
              dependencyName: location.dependencyName,
              comparisonEnabled,
              offset,
              environment,
              kuery,
              rangeFrom,
              rangeTo,
            }}
            onClick={() => {
              trackEvent({
                app: 'apm',
                metricType: METRIC_TYPE.CLICK,
                metric: 'dependencies_inventory_to_dependency_detail',
              });
            }}
          />
        );

        return {
          name,
          currentStats: {
            impact: dependency.currentStats.impact,
            totalTime: { value: dependency.currentStats.totalTime.value },
            latency: {
              value: dependency.currentStats.latency.value,
              timeseries: timeseriesData?.currentTimeseries[name]?.latency,
            },
            throughput: {
              value: dependency.currentStats.throughput.value,
              timeseries: timeseriesData?.currentTimeseries[name]?.throughput,
            },
            errorRate: {
              value: dependency.currentStats.errorRate.value,
              timeseries: timeseriesData?.currentTimeseries[name]?.errorRate,
            },
          },
          previousStats: {
            impact: dependency.previousStats?.impact ?? 0,
            totalTime: { value: dependency.previousStats?.totalTime.value ?? null },
            latency: {
              value: dependency.previousStats?.latency.value ?? null,
              timeseries: timeseriesData?.comparisonTimeseries?.[name]?.latency,
            },
            throughput: {
              value: dependency.previousStats?.throughput.value ?? null,
              timeseries: timeseriesData?.comparisonTimeseries?.[name]?.throughput,
            },
            errorRate: {
              value: dependency.previousStats?.errorRate.value ?? null,
              timeseries: timeseriesData?.comparisonTimeseries?.[name]?.errorRate,
            },
          },
          link,
        };
      }) ?? [],
    [
      comparisonEnabled,
      data?.dependencies,
      environment,
      kuery,
      offset,
      rangeFrom,
      rangeTo,
      timeseriesData?.comparisonTimeseries,
      timeseriesData?.currentTimeseries,
      trackEvent,
    ]
  );
  const showRandomSamplerBadge = data?.sampled && status === FETCH_STATUS.SUCCESS;
  const fetchingStatus =
    isPending(status) || status === undefined
      ? FETCH_STATUS.LOADING
      : !visibleDependenciesNames?.length || !data?.dependencies?.length
        ? FETCH_STATUS.SUCCESS
        : isPending(timeseriesStatus)
          ? FETCH_STATUS.LOADING
          : FETCH_STATUS.SUCCESS;
  return (
    <>
      <div
        css={css`
          min-height: ${euiTheme.size.l};
        `}
      >
        {showRandomSamplerBadge && <RandomSamplerBadge />}
      </div>

      <DependenciesTable
        dependencies={dependencies}
        title={null}
        nameColumnTitle={i18n.translate('xpack.apm.dependenciesInventory.dependencyTableColumn', {
          defaultMessage: 'Dependency',
        })}
        status={fetchingStatus}
        compact={false}
        initialPageSize={INITIAL_PAGE_SIZE}
      />
    </>
  );
}
