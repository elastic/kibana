/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { IndexPatternType } from '@kbn/io-ts-utils';
import { Integration } from '../../common/datasets';
import { FindIntegrationsRequestQuery, SortOrder } from '../../common/latest';
import { IDatasetsClient } from '../services/datasets';
import { createIntegrationStateMachine } from '../state_machines/integrations';

interface IntegrationsContextDeps {
  datasetsClient: IDatasetsClient;
}

export interface SearchIntegrationsParams {
  name: string;
  sortOrder: SortOrder;
  integrationId?: string;
}

export type SearchIntegrations = (params: SearchIntegrationsParams) => void;
export type ReloadIntegrations = () => void;
export type LoadMoreIntegrations = () => void;

const useIntegrations = ({ datasetsClient }: IntegrationsContextDeps) => {
  const integrationsStateService = useInterpret(() =>
    createIntegrationStateMachine({
      datasetsClient,
    })
  );

  // const integrations = useSelector(integrationsStateService, (state) => state.context.integrations);
  const integrations = mockIntegrations;

  const error = useSelector(integrationsStateService, (state) => state.context.error);

  const isLoading = useSelector(
    integrationsStateService,
    (state) =>
      state.matches('loading') ||
      state.matches({ loaded: 'loadingMore' }) ||
      state.matches({ loaded: 'debounceSearchingIntegrations' }) ||
      state.matches({ loaded: 'debounceSearchingIntegrationsStreams' })
  );

  const searchIntegrations: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SEARCH_INTEGRATIONS',
        search: formatSearchParams(searchParams),
      }),
    [integrationsStateService]
  );

  const sortIntegrations: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SORT_INTEGRATIONS',
        search: formatSearchParams(searchParams),
      }),
    [integrationsStateService]
  );

  const searchIntegrationsStreams: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SEARCH_INTEGRATIONS_STREAMS',
        search: formatSearchParams(searchParams),
      }),
    [integrationsStateService]
  );

  const sortIntegrationsStreams: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SORT_INTEGRATIONS_STREAMS',
        search: formatSearchParams(searchParams),
      }),
    [integrationsStateService]
  );

  const reloadIntegrations = useCallback(
    () => integrationsStateService.send({ type: 'RELOAD_INTEGRATIONS' }),
    [integrationsStateService]
  );

  const loadMore = useCallback(
    () => integrationsStateService.send({ type: 'LOAD_MORE_INTEGRATIONS' }),
    [integrationsStateService]
  );

  return {
    // Underlying state machine
    integrationsStateService,

    // Failure states
    error,

    // Loading states
    isLoading,

    // Data
    integrations,

    // Actions
    loadMore,
    reloadIntegrations,
    searchIntegrations,
    sortIntegrations,
    searchIntegrationsStreams,
    sortIntegrationsStreams,
  };
};

export const [IntegrationsProvider, useIntegrationsContext] = createContainer(useIntegrations);

/**
 * Utils
 */
const formatSearchParams = ({
  name,
  ...params
}: SearchIntegrationsParams): FindIntegrationsRequestQuery => ({
  nameQuery: name,
  ...params,
});
const mockIntegrations: Integration[] = [
  {
    name: 'system',
    version: '1.25.2',
    status: 'installed',
    dataStreams: [
      {
        title: 'System metrics stream',
        name: 'system-metrics-*' as IndexPatternType,
      },
      {
        title: 'System logs stream',
        name: 'system-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'kubernetes',
    version: '1.35.0',
    status: 'installed',
    dataStreams: [
      {
        title: 'Kubernetes metrics stream',
        name: 'k8s-metrics-*' as IndexPatternType,
      },
      {
        title: 'Kubernetes logs stream',
        name: 'k8s-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'mysql',
    version: '1.11.0',
    status: 'installed',
    dataStreams: [
      {
        title: 'MySQL metrics stream',
        name: 'mysql-metrics-*' as IndexPatternType,
      },
      {
        title: 'MySQL slow logs stream',
        name: 'mysql-slow-logs-*' as IndexPatternType,
      },
      {
        title: 'MySQL error logs stream',
        name: 'mysql-error-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'apache',
    version: '1.12.0',
    status: 'installed',
    dataStreams: [
      {
        title: 'Apache metrics stream',
        name: 'apache-metrics-*' as IndexPatternType,
      },
      {
        title: 'Apache logs stream',
        name: 'apache-logs-*' as IndexPatternType,
      },
      {
        title: 'Apache error logs stream',
        name: 'apache-error-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'nginx',
    version: '1.11.1',
    status: 'installed',
    dataStreams: [
      {
        title: 'Nginx metrics stream',
        name: 'nginx-metrics-*' as IndexPatternType,
      },
      {
        title: 'Nginx access logs stream',
        name: 'nginx-access-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'postgresql',
    version: '1.13.0',
    status: 'installed',
    dataStreams: [
      {
        title: 'PostgreSQL metrics stream',
        name: 'postgresql-metrics-*' as IndexPatternType,
      },
      {
        title: 'PostgreSQL slow query logs stream',
        name: 'postgresql-slow-query-logs-*' as IndexPatternType,
      },
      {
        title: 'PostgreSQL error logs stream',
        name: 'postgresql-error-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'rabbitmq',
    version: '1.8.8',
    status: 'installed',
    dataStreams: [
      {
        title: 'RabbitMQ metrics stream',
        name: 'rabbitmq-metrics-*' as IndexPatternType,
      },
      {
        title: 'RabbitMQ queues stream',
        name: 'rabbitmq-queues-*' as IndexPatternType,
      },
      {
        title: 'RabbitMQ error logs stream',
        name: 'rabbitmq-error-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'redis',
    version: '1.9.2',
    status: 'installed',
    dataStreams: [
      {
        title: 'Redis metrics stream',
        name: 'redis-metrics-*' as IndexPatternType,
      },
      {
        title: 'Redis slow logs stream',
        name: 'redis-slow-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'elasticsearch',
    version: '1.5.0',
    status: 'installed',
    dataStreams: [
      {
        title: 'Elasticsearch metrics stream',
        name: 'elasticsearch-metrics-*' as IndexPatternType,
      },
      {
        title: 'Elasticsearch indices stream',
        name: 'elasticsearch-indices-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'mongodb',
    version: '1.9.3',
    status: 'installed',
    dataStreams: [
      {
        title: 'MongoDB metrics stream',
        name: 'mongodb-metrics-*' as IndexPatternType,
      },
      {
        title: 'MongoDB slow query logs stream',
        name: 'mongodb-slow-query-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'prometheus',
    version: '1.3.2',
    status: 'installed',
    dataStreams: [
      {
        title: 'Prometheus metrics stream',
        name: 'prometheus-metrics-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'haproxy',
    version: '1.5.1',
    status: 'installed',
    dataStreams: [
      {
        title: 'HAProxy metrics stream',
        name: 'haproxy-metrics-*' as IndexPatternType,
      },
      {
        title: 'HAProxy logs stream',
        name: 'haproxy-logs-*' as IndexPatternType,
      },
    ],
  },
  {
    name: 'atlassian_jira',
    version: '1.10.0',
    status: 'installed',
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' as IndexPatternType },
      { title: 'Atlassian secondary', name: 'metrics-*' as IndexPatternType },
    ],
  },
  {
    name: 'atlassian_confluence',
    version: '1.10.0',
    status: 'installed',
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' as IndexPatternType },
      { title: 'Atlassian secondary', name: 'metrics-*' as IndexPatternType },
    ],
  },
  {
    name: 'atlassian_bitbucket',
    version: '1.9.0',
    status: 'installed',
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' as IndexPatternType },
      { title: 'Atlassian secondary', name: 'metrics-*' as IndexPatternType },
    ],
  },
  {
    name: 'docker',
    version: '2.4.3',
    status: 'installed',
    dataStreams: [
      { title: 'Docker container logs', name: 'docker-*' as IndexPatternType },
      { title: 'Docker daemon logs', name: 'docker-daemon-*' as IndexPatternType },
    ],
  },
  {
    name: 'aws',
    version: '1.36.3',
    status: 'installed',
    dataStreams: [
      { title: 'AWS S3 object access logs', name: 'aws-s3-access-' as IndexPatternType },
      { title: 'AWS S3 bucket access logs', name: 'aws-s3-bucket-access-' as IndexPatternType },
    ],
  },
  {
    name: 'cassandra',
    version: '1.6.0',
    status: 'installed',
    dataStreams: [
      { title: 'Cassandra server logs', name: 'cassandra-' as IndexPatternType },
      { title: 'Cassandra slow queries', name: 'cassandra-slow-' as IndexPatternType },
      { title: 'Cassandra errors', name: 'cassandra-errors-' as IndexPatternType },
    ],
  },
  {
    name: 'nginx_ingress_controller',
    version: '1.7.1',
    status: 'installed',
    dataStreams: [{ title: 'Nginx ingress logs', name: 'nginx-ingress-' as IndexPatternType }],
  },
  {
    name: 'gcp',
    version: '2.20.1',
    status: 'installed',
    dataStreams: [{ title: 'GCP Stackdriver logs', name: 'gcp-stackdriver-*' as IndexPatternType }],
  },
  {
    name: 'kafka',
    version: '1.5.6',
    status: 'installed',
    dataStreams: [{ title: 'Kafka server logs', name: 'kafka-*' as IndexPatternType }],
  },
  {
    name: 'kibana',
    version: '2.3.4',
    status: 'installed',
    dataStreams: [{ title: 'Kibana server logs', name: 'kibana-*' as IndexPatternType }],
  },
].map(Integration.create);
