/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from '@xstate/react';
import { getDateISORange } from '@kbn/timerange';
import { AggregateQuery, Query } from '@kbn/es-query';

import { MASKED_FIELD_PLACEHOLDER, UNKOWN_FIELD_PLACEHOLDER } from '../../common/constants';
import { DataStreamStat } from '../../common/data_streams_stats';
import { DataStreamDetails } from '../../common/api_types';
import { mapPercentageToQuality } from '../../common/utils';
import {
  NavigationTarget,
  NavigationSource,
  DatasetDetailsEbtProps,
  DatasetNavigatedEbtProps,
  DatasetEbtProps,
} from '../services/telemetry';
import { FlyoutDataset, TimeRangeConfig } from '../state_machines/dataset_quality_controller';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useDatasetQualityFilters } from './use_dataset_quality_filters';

export const useRedirectLinkTelemetry = ({
  rawName,
  isLogsExplorer,
  telemetry,
  query,
}: {
  rawName: string;
  isLogsExplorer: boolean;
  telemetry?: {
    page: 'main' | 'details';
    navigationSource: NavigationSource;
  };
  query?: Query | AggregateQuery;
}) => {
  const { trackDatasetNavigated } = useDatasetTelemetry();
  const { trackDetailsNavigated, navigationTargets } = useDatasetDetailsTelemetry();

  const sendTelemetry = useCallback(() => {
    if (telemetry) {
      const isIgnoredFilter = query ? JSON.stringify(query).includes('_ignored') : false;
      if (telemetry.page === 'main') {
        trackDatasetNavigated(rawName, isIgnoredFilter);
      } else {
        trackDetailsNavigated(
          isLogsExplorer ? navigationTargets.LogsExplorer : navigationTargets.Discover,
          telemetry.navigationSource,
          isIgnoredFilter
        );
      }
    }
  }, [
    isLogsExplorer,
    trackDetailsNavigated,
    navigationTargets,
    query,
    rawName,
    telemetry,
    trackDatasetNavigated,
  ]);

  const wrapLinkPropsForTelemetry = useCallback(
    (props: RouterLinkProps) => {
      return {
        ...props,
        onClick: (event: Parameters<RouterLinkProps['onClick']>[0]) => {
          sendTelemetry();
          if (props.onClick) {
            props.onClick(event);
          }
        },
      };
    },
    [sendTelemetry]
  );

  return {
    wrapLinkPropsForTelemetry,
    sendTelemetry,
  };
};

export const useDatasetTelemetry = () => {
  const { service, telemetryClient } = useDatasetQualityContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const datasets = useSelector(service, (state) => state.context.datasets) ?? {};
  const nonAggregatableDatasets = useSelector(
    service,
    (state) => state.context.nonAggregatableDatasets
  );
  const canUserViewIntegrations = useSelector(
    service,
    (state) => state.context.datasetUserPrivileges.canViewIntegrations
  );
  const sort = useSelector(service, (state) => state.context.table.sort);
  const appliedFilters = useDatasetQualityFilters();

  const trackDatasetNavigated = useCallback<(rawName: string, isIgnoredFilter: boolean) => void>(
    (rawName: string, isIgnoredFilter: boolean) => {
      const foundDataset = datasets.find((dataset) => dataset.rawName === rawName);
      if (foundDataset) {
        const ebtProps = getDatasetEbtProps(
          foundDataset,
          sort,
          appliedFilters,
          nonAggregatableDatasets,
          isIgnoredFilter,
          canUserViewIntegrations
        );
        telemetryClient.trackDatasetNavigated(ebtProps);
      } else {
        throw new Error(
          `Cannot report dataset navigation telemetry for unknown dataset ${rawName}`
        );
      }
    },
    [
      sort,
      appliedFilters,
      canUserViewIntegrations,
      datasets,
      nonAggregatableDatasets,
      telemetryClient,
    ]
  );

  return { trackDatasetNavigated };
};

export const useDatasetDetailsTelemetry = () => {
  const { service, telemetryClient } = useDatasetQualityContext();

  const {
    dataset: dataStreamStat,
    datasetDetails: dataStreamDetails,
    insightsTimeRange,
    breakdownField,
    isNonAggregatable,
    isBreakdownFieldEcs,
  } = useSelector(service, (state) => state.context.flyout) ?? {};

  const loadingState = useSelector(service, (state) => ({
    dataStreamDetailsLoading:
      state.matches('flyout.initializing.dataStreamDetails.fetching') ||
      state.matches('flyout.initializing.assertBreakdownFieldIsEcs.fetching'),
  }));

  const canUserAccessDashboards = useSelector(
    service,
    (state) => !state.matches('flyout.initializing.integrationDashboards.unauthorized')
  );

  const canUserViewIntegrations = useSelector(
    service,
    (state) => state.context.datasetUserPrivileges.canViewIntegrations
  );

  const ebtProps = useMemo<DatasetDetailsEbtProps | undefined>(() => {
    if (
      dataStreamDetails &&
      insightsTimeRange &&
      dataStreamStat &&
      !loadingState.dataStreamDetailsLoading
    ) {
      return getDatasetDetailsEbtProps(
        insightsTimeRange,
        dataStreamStat,
        dataStreamDetails,
        isNonAggregatable ?? false,
        canUserViewIntegrations,
        canUserAccessDashboards,
        isBreakdownFieldEcs,
        breakdownField
      );
    }

    return undefined;
  }, [
    insightsTimeRange,
    dataStreamStat,
    dataStreamDetails,
    loadingState.dataStreamDetailsLoading,
    isNonAggregatable,
    canUserViewIntegrations,
    canUserAccessDashboards,
    isBreakdownFieldEcs,
    breakdownField,
  ]);

  const startTracking = useCallback(() => {
    telemetryClient.startDatasetDetailsTracking();
  }, [telemetryClient]);

  // Report opening dataset details
  useEffect(() => {
    const datasetDetailsTrackingState = telemetryClient.getDatasetDetailsTrackingState();
    if (datasetDetailsTrackingState === 'started' && ebtProps) {
      telemetryClient.trackDatasetDetailsOpened(ebtProps);
    }
  }, [ebtProps, telemetryClient]);

  const trackDetailsNavigated = useCallback(
    (target: NavigationTarget, source: NavigationSource, isDegraded = false) => {
      const datasetDetailsTrackingState = telemetryClient.getDatasetDetailsTrackingState();
      if (
        (datasetDetailsTrackingState === 'opened' || datasetDetailsTrackingState === 'navigated') &&
        ebtProps
      ) {
        telemetryClient.trackDatasetDetailsNavigated({
          ...ebtProps,
          filters: {
            is_degraded: isDegraded,
          },
          target,
          source,
        });
      } else {
        throw new Error(
          'Cannot report dataset details navigation telemetry without required data and state'
        );
      }
    },
    [ebtProps, telemetryClient]
  );

  const trackDatasetDetailsBreakdownFieldChanged = useCallback(() => {
    const datasetDetailsTrackingState = telemetryClient.getDatasetDetailsTrackingState();
    if (
      (datasetDetailsTrackingState === 'opened' || datasetDetailsTrackingState === 'navigated') &&
      ebtProps
    ) {
      telemetryClient.trackDatasetDetailsBreakdownFieldChanged({
        ...ebtProps,
        breakdown_field: ebtProps.breakdown_field,
      });
    }
  }, [ebtProps, telemetryClient]);

  const wrapLinkPropsForTelemetry = useCallback(
    (
      props: RouterLinkProps,
      target: NavigationTarget,
      source: NavigationSource,
      isDegraded = false
    ) => {
      return {
        ...props,
        onClick: (event: Parameters<RouterLinkProps['onClick']>[0]) => {
          trackDetailsNavigated(target, source, isDegraded);
          if (props.onClick) {
            props.onClick(event);
          }
        },
      };
    },
    [trackDetailsNavigated]
  );

  return {
    startTracking,
    trackDetailsNavigated,
    wrapLinkPropsForTelemetry,
    navigationTargets: NavigationTarget,
    navigationSources: NavigationSource,
    trackDatasetDetailsBreakdownFieldChanged,
  };
};

function getDatasetEbtProps(
  dataset: DataStreamStat,
  sort: { field: string; direction: 'asc' | 'desc' },
  filters: ReturnType<typeof useDatasetQualityFilters>,
  nonAggregatableDatasets: string[],
  isIgnoredFilter: boolean,
  canUserViewIntegrations: boolean
): DatasetNavigatedEbtProps {
  const { startDate: from, endDate: to } = getDateISORange(filters.timeRange);
  const datasetEbtProps: DatasetEbtProps = {
    index_name: dataset.rawName,
    data_stream: {
      dataset: dataset.name,
      namespace: dataset.namespace,
      type: dataset.type,
    },
    data_stream_health: dataset.degradedDocs.quality,
    data_stream_aggregatable: nonAggregatableDatasets.some(
      (indexName) => indexName === dataset.rawName
    ),
    from,
    to,
    degraded_percentage: dataset.degradedDocs.percentage,
    integration: dataset.integration?.name,
    privileges: {
      can_monitor_data_stream: dataset.userPrivileges?.canMonitor ?? true,
      can_view_integrations: canUserViewIntegrations,
    },
  };

  const ebtFilters: DatasetNavigatedEbtProps['filters'] = {
    is_degraded: isIgnoredFilter,
    query_length: filters.selectedQuery?.length ?? 0,
    integrations: {
      total: filters.integrations.filter((item) => item.name !== 'none').length,
      included: filters.integrations.filter((item) => item?.checked === 'on').length,
      excluded: filters.integrations.filter((item) => item?.checked === 'off').length,
    },
    namespaces: {
      total: filters.namespaces.length,
      included: filters.namespaces.filter((item) => item?.checked === 'on').length,
      excluded: filters.namespaces.filter((item) => item?.checked === 'off').length,
    },
    qualities: {
      total: filters.qualities.length,
      included: filters.qualities.filter((item) => item?.checked === 'on').length,
      excluded: filters.qualities.filter((item) => item?.checked === 'off').length,
    },
  };

  return {
    ...datasetEbtProps,
    sort,
    filters: ebtFilters,
  };
}

function getDatasetDetailsEbtProps(
  insightsTimeRange: TimeRangeConfig,
  flyoutDataset: FlyoutDataset,
  details: DataStreamDetails,
  isNonAggregatable: boolean,
  canUserViewIntegrations: boolean,
  canUserAccessDashboards: boolean,
  isBreakdownFieldEcs: boolean | null,
  breakdownField?: string
): DatasetDetailsEbtProps {
  const indexName = flyoutDataset.rawName;
  const dataStream = {
    dataset: flyoutDataset.name,
    namespace: flyoutDataset.namespace,
    type: flyoutDataset.type,
  };
  const degradedDocs = details?.degradedDocsCount ?? 0;
  const totalDocs = details?.docsCount ?? 0;
  const degradedPercentage =
    totalDocs > 0 ? Number(((degradedDocs / totalDocs) * 100).toFixed(2)) : 0;
  const health = mapPercentageToQuality(degradedPercentage);
  const { startDate: from, endDate: to } = getDateISORange(insightsTimeRange);

  return {
    index_name: indexName,
    data_stream: dataStream,
    privileges: {
      can_monitor_data_stream: true,
      can_view_integrations: canUserViewIntegrations,
      can_view_dashboards: canUserAccessDashboards,
    },
    data_stream_aggregatable: !isNonAggregatable,
    data_stream_health: health,
    from,
    to,
    degraded_percentage: degradedPercentage,
    integration: flyoutDataset.integration?.name,
    breakdown_field: breakdownField
      ? isBreakdownFieldEcs === null
        ? UNKOWN_FIELD_PLACEHOLDER
        : getMaskedBreakdownField(breakdownField, isBreakdownFieldEcs)
      : breakdownField,
  };
}

function getMaskedBreakdownField(breakdownField: string, isBreakdownFieldEcs: boolean) {
  return isBreakdownFieldEcs ? breakdownField : MASKED_FIELD_PLACEHOLDER;
}
