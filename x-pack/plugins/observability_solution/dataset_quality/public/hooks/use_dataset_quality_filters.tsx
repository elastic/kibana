/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnRefreshChangeProps } from '@elastic/eui';
import { useSelector } from '@xstate/react';
import { useCallback, useMemo } from 'react';
import { Integration } from '../../common/data_streams_stats/integration';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { IntegrationItem } from '../components/dataset_quality/filters/integrations_selector';
import { NamespaceItem } from '../components/dataset_quality/filters/namespaces_selector';

export const useDatasetQualityFilters = () => {
  const { service } = useDatasetQualityContext();

  const isLoading = useSelector(service, (state) => state.matches('datasets.fetching'));
  const {
    timeRange,
    integrations: selectedIntegrations,
    namespaces: selectedNamespaces,
    query: selectedQuery,
  } = useSelector(service, (state) => state.context.filters);
  const datasets = useSelector(service, (state) => state.context.datasets);

  const namespaces = useSelector(service, (state) => state.context.datasets).map(
    (dataset) => dataset.namespace
  );

  const onTimeChange = useCallback(
    (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
      if (selectedTime.isInvalid) {
        return;
      }

      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          from: selectedTime.start,
          to: selectedTime.end,
        },
      });
    },
    [service, timeRange]
  );

  const onRefresh = useCallback(() => {
    service.send({
      type: 'REFRESH_DATA',
    });
  }, [service]);

  const onRefreshChange = useCallback(
    ({ refreshInterval, isPaused }: OnRefreshChangeProps) => {
      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          refresh: {
            pause: isPaused,
            value: refreshInterval,
          },
        },
      });
    },
    [service, timeRange]
  );

  const integrationItems: IntegrationItem[] = useMemo(() => {
    const integrations = [
      ...datasets
        .map((dataset) => dataset.integration)
        .filter((integration): integration is Integration => !!integration),
      ...(datasets.some((dataset) => !dataset.integration)
        ? [Integration.create({ name: 'none', title: 'None' })]
        : []),
    ];

    return integrations.map((integration) => ({
      ...integration,
      label: integration.title,
      checked: selectedIntegrations.includes(integration.name) ? 'on' : undefined,
    }));
  }, [datasets, selectedIntegrations]);

  const onIntegrationsChange = useCallback(
    (newIntegrationItems: IntegrationItem[]) => {
      service.send({
        type: 'UPDATE_INTEGRATIONS',
        integrations: newIntegrationItems
          .filter((integration) => integration.checked === 'on')
          .map((integration) => integration.name),
      });
    },
    [service]
  );

  const namespaceItems: NamespaceItem[] = useMemo(() => {
    const uniqueNamespaces = [...new Set(namespaces)];

    return uniqueNamespaces.map((namespace) => ({
      label: namespace,
      checked: selectedNamespaces.includes(namespace) ? 'on' : undefined,
    }));
  }, [namespaces, selectedNamespaces]);

  const onNamespacesChange = useCallback(
    (newNamespaceItems: NamespaceItem[]) => {
      service.send({
        type: 'UPDATE_NAMESPACES',
        namespaces: newNamespaceItems
          .filter((namespace) => namespace.checked === 'on')
          .map((namespace) => namespace.label),
      });
    },
    [service]
  );

  const onQueryChange = useCallback(
    (query: string) => {
      service.send({
        type: 'UPDATE_QUERY',
        query,
      });
    },
    [service]
  );

  return {
    timeRange,
    onTimeChange,
    onRefresh,
    onRefreshChange,
    integrations: integrationItems,
    namespaces: namespaceItems,
    onIntegrationsChange,
    onNamespacesChange,
    isLoading,
    selectedQuery,
    onQueryChange,
  };
};
