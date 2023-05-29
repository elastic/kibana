/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Story } from '@storybook/react';
import { IndexPatternType } from '@kbn/io-ts-utils';
import { DataStream, Integration } from '../../../common/data_streams';
import { DataStreamSelector } from './data_stream_selector';
import { DataStreamSelectorProps, SearchControlsParams } from './types';

export default {
  component: DataStreamSelector,
  title: 'observability_logs/DataStreamSelector',
  decorators: [(wrappedStory) => <I18nProvider>{wrappedStory()}</I18nProvider>],
  argTypes: {
    dataStreamsError: {
      options: [null, { message: 'Failed to fetch data streams' }],
      control: { type: 'radio' },
    },
    integrationsError: {
      options: [null, { message: 'Failed to fetch data integrations' }],
      control: { type: 'radio' },
    },
  },
};

const DataStreamSelectorTemplate: Story<DataStreamSelectorProps> = (args) => {
  const [title, setTitle] = useState(mockIntegrations[0].dataStreams[0].title as string);
  const [search, setSearch] = useState<SearchControlsParams>({ sortOrder: 'asc', name: '' });
  const [integrations, setIntegrations] = useState(() => mockIntegrations.slice(0, 10));

  const onIntegrationsLoadMore = () => {
    if (integrations.length < mockIntegrations.length) {
      setIntegrations((prev) => prev.concat(mockIntegrations.slice(prev.length, prev.length + 10)));
    }
  };

  const onStreamSelected = (stream: DataStream) => {
    setTitle(stream.title || stream.name);
  };

  const filteredIntegrations = integrations.filter((integration) =>
    integration.name.includes(search.name as string)
  );

  const sortedIntegrations =
    search.sortOrder === 'asc' ? filteredIntegrations : filteredIntegrations.reverse();

  const filteredDataStreams = mockDataStreams.filter((dataStream) =>
    dataStream.name.includes(search.name as string)
  );

  const sortedDataStreams =
    search.sortOrder === 'asc' ? filteredDataStreams : filteredDataStreams.reverse();

  return (
    <DataStreamSelector
      {...args}
      dataStreams={sortedDataStreams}
      integrations={sortedIntegrations}
      onIntegrationsLoadMore={onIntegrationsLoadMore}
      onIntegrationsSearch={setSearch}
      onIntegrationsSort={setSearch}
      onIntegrationsStreamsSearch={setSearch}
      onIntegrationsStreamsSort={setSearch}
      onStreamSelected={onStreamSelected}
      onUnmanagedStreamsSearch={setSearch}
      onUnmanagedStreamsSort={setSearch}
      title={title}
    />
  );
};

export const Basic = DataStreamSelectorTemplate.bind({});
Basic.args = {
  dataStreamsError: null,
  integrationsError: null,
  isLoadingIntegrations: false,
  isLoadingStreams: false,
  onIntegrationsReload: () => alert('Reload integrations...'),
  onStreamsEntryClick: () => console.log('Load uncategorized streams...'),
  onUnmanagedStreamsReload: () => alert('Reloading streams...'),
};

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
];

const mockDataStreams: DataStream[] = [
  { name: 'logs-*' as IndexPatternType },
  { name: 'system-logs-*' as IndexPatternType },
  { name: 'nginx-logs-*' as IndexPatternType },
  { name: 'apache-logs-*' as IndexPatternType },
  { name: 'security-logs-*' as IndexPatternType },
  { name: 'error-logs-*' as IndexPatternType },
  { name: 'access-logs-*' as IndexPatternType },
  { name: 'firewall-logs-*' as IndexPatternType },
  { name: 'application-logs-*' as IndexPatternType },
  { name: 'debug-logs-*' as IndexPatternType },
  { name: 'transaction-logs-*' as IndexPatternType },
  { name: 'audit-logs-*' as IndexPatternType },
  { name: 'server-logs-*' as IndexPatternType },
  { name: 'database-logs-*' as IndexPatternType },
  { name: 'event-logs-*' as IndexPatternType },
  { name: 'auth-logs-*' as IndexPatternType },
  { name: 'billing-logs-*' as IndexPatternType },
  { name: 'network-logs-*' as IndexPatternType },
  { name: 'performance-logs-*' as IndexPatternType },
  { name: 'email-logs-*' as IndexPatternType },
  { name: 'job-logs-*' as IndexPatternType },
  { name: 'task-logs-*' as IndexPatternType },
  { name: 'user-logs-*' as IndexPatternType },
  { name: 'request-logs-*' as IndexPatternType },
  { name: 'payment-logs-*' as IndexPatternType },
  { name: 'inventory-logs-*' as IndexPatternType },
  { name: 'debugging-logs-*' as IndexPatternType },
  { name: 'scheduler-logs-*' as IndexPatternType },
  { name: 'diagnostic-logs-*' as IndexPatternType },
  { name: 'cluster-logs-*' as IndexPatternType },
  { name: 'service-logs-*' as IndexPatternType },
  { name: 'framework-logs-*' as IndexPatternType },
  { name: 'api-logs-*' as IndexPatternType },
  { name: 'load-balancer-logs-*' as IndexPatternType },
  { name: 'reporting-logs-*' as IndexPatternType },
  { name: 'backend-logs-*' as IndexPatternType },
  { name: 'frontend-logs-*' as IndexPatternType },
  { name: 'chat-logs-*' as IndexPatternType },
  { name: 'error-tracking-logs-*' as IndexPatternType },
  { name: 'payment-gateway-logs-*' as IndexPatternType },
  { name: 'auth-service-logs-*' as IndexPatternType },
  { name: 'billing-service-logs-*' as IndexPatternType },
  { name: 'database-service-logs-*' as IndexPatternType },
  { name: 'api-gateway-logs-*' as IndexPatternType },
  { name: 'event-service-logs-*' as IndexPatternType },
  { name: 'notification-service-logs-*' as IndexPatternType },
  { name: 'search-service-logs-*' as IndexPatternType },
  { name: 'logging-service-logs-*' as IndexPatternType },
  { name: 'performance-service-logs-*' as IndexPatternType },
  { name: 'load-testing-logs-*' as IndexPatternType },
  { name: 'mobile-app-logs-*' as IndexPatternType },
  { name: 'web-app-logs-*' as IndexPatternType },
  { name: 'stream-processing-logs-*' as IndexPatternType },
  { name: 'batch-processing-logs-*' as IndexPatternType },
  { name: 'cloud-service-logs-*' as IndexPatternType },
  { name: 'container-logs-*' as IndexPatternType },
  { name: 'serverless-logs-*' as IndexPatternType },
  { name: 'server-administration-logs-*' as IndexPatternType },
  { name: 'application-deployment-logs-*' as IndexPatternType },
  { name: 'webserver-logs-*' as IndexPatternType },
  { name: 'payment-processor-logs-*' as IndexPatternType },
  { name: 'inventory-service-logs-*' as IndexPatternType },
  { name: 'data-pipeline-logs-*' as IndexPatternType },
  { name: 'frontend-service-logs-*' as IndexPatternType },
  { name: 'backend-service-logs-*' as IndexPatternType },
  { name: 'resource-monitoring-logs-*' as IndexPatternType },
  { name: 'logging-aggregation-logs-*' as IndexPatternType },
  { name: 'container-orchestration-logs-*' as IndexPatternType },
  { name: 'security-audit-logs-*' as IndexPatternType },
  { name: 'api-management-logs-*' as IndexPatternType },
  { name: 'service-mesh-logs-*' as IndexPatternType },
  { name: 'data-processing-logs-*' as IndexPatternType },
  { name: 'data-science-logs-*' as IndexPatternType },
  { name: 'machine-learning-logs-*' as IndexPatternType },
  { name: 'experimentation-logs-*' as IndexPatternType },
  { name: 'data-visualization-logs-*' as IndexPatternType },
  { name: 'data-cleaning-logs-*' as IndexPatternType },
  { name: 'data-transformation-logs-*' as IndexPatternType },
  { name: 'data-analysis-logs-*' as IndexPatternType },
  { name: 'data-storage-logs-*' as IndexPatternType },
  { name: 'data-retrieval-logs-*' as IndexPatternType },
  { name: 'data-warehousing-logs-*' as IndexPatternType },
  { name: 'data-modeling-logs-*' as IndexPatternType },
  { name: 'data-integration-logs-*' as IndexPatternType },
  { name: 'data-quality-logs-*' as IndexPatternType },
  { name: 'data-security-logs-*' as IndexPatternType },
  { name: 'data-encryption-logs-*' as IndexPatternType },
  { name: 'data-governance-logs-*' as IndexPatternType },
  { name: 'data-compliance-logs-*' as IndexPatternType },
  { name: 'data-privacy-logs-*' as IndexPatternType },
  { name: 'data-auditing-logs-*' as IndexPatternType },
  { name: 'data-discovery-logs-*' as IndexPatternType },
  { name: 'data-protection-logs-*' as IndexPatternType },
  { name: 'data-archiving-logs-*' as IndexPatternType },
  { name: 'data-backup-logs-*' as IndexPatternType },
  { name: 'data-recovery-logs-*' as IndexPatternType },
  { name: 'data-replication-logs-*' as IndexPatternType },
  { name: 'data-synchronization-logs-*' as IndexPatternType },
  { name: 'data-migration-logs-*' as IndexPatternType },
  { name: 'data-load-balancing-logs-*' as IndexPatternType },
  { name: 'data-scaling-logs-*' as IndexPatternType },
];
