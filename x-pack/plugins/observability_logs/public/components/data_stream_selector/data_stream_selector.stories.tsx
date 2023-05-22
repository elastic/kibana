/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Story } from '@storybook/react';
import { DataStreamSelector, DataStreamSelectorProps } from './data_stream_selector';

export default {
  component: DataStreamSelector,
  title: 'observability_logs/DataStreamSelector',
  decorators: [(wrappedStory) => <I18nProvider>{wrappedStory()}</I18nProvider>],
};

const DataStreamSelectorTemplate: Story<DataStreamSelectorProps> = (args) => (
  <DataStreamSelector {...args} />
);

export const Basic = DataStreamSelectorTemplate.bind({});
Basic.args = {
  title: 'Current stream name',
  dataStreams: [
    { name: 'logs-*' },
    { name: 'system-logs-*' },
    { name: 'nginx-logs-*' },
    { name: 'apache-logs-*' },
    { name: 'security-logs-*' },
    { name: 'error-logs-*' },
    { name: 'access-logs-*' },
    { name: 'firewall-logs-*' },
    { name: 'application-logs-*' },
    { name: 'debug-logs-*' },
    { name: 'transaction-logs-*' },
    { name: 'audit-logs-*' },
    { name: 'server-logs-*' },
    { name: 'database-logs-*' },
    { name: 'event-logs-*' },
    { name: 'auth-logs-*' },
    { name: 'billing-logs-*' },
    { name: 'network-logs-*' },
    { name: 'performance-logs-*' },
    { name: 'email-logs-*' },
    { name: 'job-logs-*' },
    { name: 'task-logs-*' },
    { name: 'user-logs-*' },
    { name: 'request-logs-*' },
    { name: 'payment-logs-*' },
    { name: 'inventory-logs-*' },
    { name: 'debugging-logs-*' },
    { name: 'scheduler-logs-*' },
    { name: 'diagnostic-logs-*' },
    { name: 'cluster-logs-*' },
    { name: 'service-logs-*' },
    { name: 'framework-logs-*' },
    { name: 'api-logs-*' },
    { name: 'load-balancer-logs-*' },
    { name: 'reporting-logs-*' },
    { name: 'backend-logs-*' },
    { name: 'frontend-logs-*' },
    { name: 'chat-logs-*' },
    { name: 'error-tracking-logs-*' },
    { name: 'payment-gateway-logs-*' },
    { name: 'auth-service-logs-*' },
    { name: 'billing-service-logs-*' },
    { name: 'database-service-logs-*' },
    { name: 'api-gateway-logs-*' },
    { name: 'event-service-logs-*' },
    { name: 'notification-service-logs-*' },
    { name: 'search-service-logs-*' },
    { name: 'logging-service-logs-*' },
    { name: 'performance-service-logs-*' },
    { name: 'load-testing-logs-*' },
    { name: 'mobile-app-logs-*' },
    { name: 'web-app-logs-*' },
    { name: 'stream-processing-logs-*' },
    { name: 'batch-processing-logs-*' },
    { name: 'cloud-service-logs-*' },
    { name: 'container-logs-*' },
    { name: 'serverless-logs-*' },
    { name: 'server-administration-logs-*' },
    { name: 'application-deployment-logs-*' },
    { name: 'webserver-logs-*' },
    { name: 'payment-processor-logs-*' },
    { name: 'inventory-service-logs-*' },
    { name: 'data-pipeline-logs-*' },
    { name: 'frontend-service-logs-*' },
    { name: 'backend-service-logs-*' },
    { name: 'resource-monitoring-logs-*' },
    { name: 'logging-aggregation-logs-*' },
    { name: 'container-orchestration-logs-*' },
    { name: 'security-audit-logs-*' },
    { name: 'api-management-logs-*' },
    { name: 'service-mesh-logs-*' },
    { name: 'data-processing-logs-*' },
    { name: 'data-science-logs-*' },
    { name: 'machine-learning-logs-*' },
    { name: 'experimentation-logs-*' },
    { name: 'data-visualization-logs-*' },
    { name: 'data-cleaning-logs-*' },
    { name: 'data-transformation-logs-*' },
    { name: 'data-analysis-logs-*' },
    { name: 'data-storage-logs-*' },
    { name: 'data-retrieval-logs-*' },
    { name: 'data-warehousing-logs-*' },
    { name: 'data-modeling-logs-*' },
    { name: 'data-integration-logs-*' },
    { name: 'data-quality-logs-*' },
    { name: 'data-security-logs-*' },
    { name: 'data-encryption-logs-*' },
    { name: 'data-governance-logs-*' },
    { name: 'data-compliance-logs-*' },
    { name: 'data-privacy-logs-*' },
    { name: 'data-auditing-logs-*' },
    { name: 'data-discovery-logs-*' },
    { name: 'data-protection-logs-*' },
    { name: 'data-archiving-logs-*' },
    { name: 'data-backup-logs-*' },
    { name: 'data-recovery-logs-*' },
    { name: 'data-replication-logs-*' },
    { name: 'data-synchronization-logs-*' },
    { name: 'data-migration-logs-*' },
    { name: 'data-load-balancing-logs-*' },
    { name: 'data-scaling-logs-*' },
  ],
  dataStreamsError: null,
  integrations: [
    {
      name: 'system',
      version: '1.25.2',
      status: 'installed',
      dataStreams: [
        {
          name: 'System metrics stream',
          title: 'system-metrics-*',
        },
        {
          name: 'System logs stream',
          title: 'system-logs-*',
        },
      ],
    },
    {
      name: 'kubernetes',
      version: '1.35.0',
      status: 'installed',
      dataStreams: [
        {
          name: 'Kubernetes metrics stream',
          title: 'k8s-metrics-*',
        },
        {
          name: 'Kubernetes logs stream',
          title: 'k8s-logs-*',
        },
      ],
    },
    {
      name: 'mysql',
      version: '1.11.0',
      status: 'installed',
      dataStreams: [
        {
          name: 'MySQL metrics stream',
          title: 'mysql-metrics-*',
        },
        {
          name: 'MySQL slow logs stream',
          title: 'mysql-slow-logs-*',
        },
        {
          name: 'MySQL error logs stream',
          title: 'mysql-error-logs-*',
        },
      ],
    },
    {
      name: 'apache',
      version: '1.12.0',
      status: 'installed',
      dataStreams: [
        {
          name: 'Apache metrics stream',
          title: 'apache-metrics-*',
        },
        {
          name: 'Apache logs stream',
          title: 'apache-logs-*',
        },
        {
          name: 'Apache error logs stream',
          title: 'apache-error-logs-*',
        },
      ],
    },
    {
      name: 'nginx',
      version: '1.11.1',
      status: 'installed',
      dataStreams: [
        {
          name: 'Nginx metrics stream',
          title: 'nginx-metrics-*',
        },
        {
          name: 'Nginx access logs stream',
          title: 'nginx-access-logs-*',
        },
      ],
    },
    {
      name: 'postgresql',
      version: '1.13.0',
      status: 'installed',
      dataStreams: [
        {
          name: 'PostgreSQL metrics stream',
          title: 'postgresql-metrics-*',
        },
        {
          name: 'PostgreSQL slow query logs stream',
          title: 'postgresql-slow-query-logs-*',
        },
        {
          name: 'PostgreSQL error logs stream',
          title: 'postgresql-error-logs-*',
        },
      ],
    },
    {
      name: 'rabbitmq',
      version: '1.8.8',
      status: 'installed',
      dataStreams: [
        {
          name: 'RabbitMQ metrics stream',
          title: 'rabbitmq-metrics-*',
        },
        {
          name: 'RabbitMQ queues stream',
          title: 'rabbitmq-queues-*',
        },
        {
          name: 'RabbitMQ error logs stream',
          title: 'rabbitmq-error-logs-*',
        },
      ],
    },
    {
      name: 'redis',
      version: '1.9.2',
      status: 'installed',
      dataStreams: [
        {
          name: 'Redis metrics stream',
          title: 'redis-metrics-*',
        },
        {
          name: 'Redis slow logs stream',
          title: 'redis-slow-logs-*',
        },
      ],
    },
    {
      name: 'elasticsearch',
      version: '1.5.0',
      status: 'installed',
      dataStreams: [
        {
          name: 'Elasticsearch metrics stream',
          title: 'elasticsearch-metrics-*',
        },
        {
          name: 'Elasticsearch indices stream',
          title: 'elasticsearch-indices-*',
        },
      ],
    },
    {
      name: 'mongodb',
      version: '1.9.3',
      status: 'installed',
      dataStreams: [
        {
          name: 'MongoDB metrics stream',
          title: 'mongodb-metrics-*',
        },
        {
          name: 'MongoDB slow query logs stream',
          title: 'mongodb-slow-query-logs-*',
        },
      ],
    },
    {
      name: 'prometheus',
      version: '1.3.2',
      status: 'installed',
      dataStreams: [
        {
          name: 'Prometheus metrics stream',
          title: 'prometheus-metrics-*',
        },
      ],
    },
    {
      name: 'haproxy',
      version: '1.5.1',
      status: 'installed',
      dataStreams: [
        {
          name: 'HAProxy metrics stream',
          title: 'haproxy-metrics-*',
        },
        {
          name: 'HAProxy logs stream',
          title: 'haproxy-logs-*',
        },
      ],
    },
    {
      name: 'atlassian_jira',
      version: '1.10.0',
      status: 'installed',
      dataStreams: [
        { name: 'Atlassian metrics stream', title: 'metrics-*' },
        { name: 'Atlassian secondary', title: 'metrics-*' },
      ],
    },
    {
      name: 'atlassian_confluence',
      version: '1.10.0',
      status: 'installed',
      dataStreams: [
        { name: 'Atlassian metrics stream', title: 'metrics-*' },
        { name: 'Atlassian secondary', title: 'metrics-*' },
      ],
    },
    {
      name: 'atlassian_bitbucket',
      version: '1.9.0',
      status: 'installed',
      dataStreams: [
        { name: 'Atlassian metrics stream', title: 'metrics-*' },
        { name: 'Atlassian secondary', title: 'metrics-*' },
      ],
    },
    {
      name: 'docker',
      version: '2.4.3',
      status: 'installed',
      dataStreams: [
        { name: 'Docker container logs', title: 'docker-*' },
        { name: 'Docker daemon logs', title: 'docker-daemon-*' },
      ],
    },
    {
      name: 'aws',
      version: '1.36.3',
      status: 'installed',
      dataStreams: [
        { name: 'AWS S3 object access logs', title: 'aws-s3-access-' },
        { name: 'AWS S3 bucket access logs', title: 'aws-s3-bucket-access-' },
      ],
    },
    {
      name: 'cassandra',
      version: '1.6.0',
      status: 'installed',
      dataStreams: [
        { name: 'Cassandra server logs', title: 'cassandra-' },
        { name: 'Cassandra slow queries', title: 'cassandra-slow-' },
        { name: 'Cassandra errors', title: 'cassandra-errors-' },
      ],
    },
    {
      name: 'nginx_ingress_controller',
      version: '1.7.1',
      status: 'installed',
      dataStreams: [{ name: 'Nginx ingress logs', title: 'nginx-ingress-' }],
    },
    {
      name: 'gcp',
      version: '2.20.1',
      status: 'installed',
      dataStreams: [{ name: 'GCP Stackdriver logs', title: 'gcp-stackdriver-*' }],
    },
    {
      name: 'kafka',
      version: '1.5.6',
      status: 'installed',
      dataStreams: [{ name: 'Kafka server logs', title: 'kafka-*' }],
    },
    {
      name: 'kibana',
      version: '2.3.4',
      status: 'installed',
      dataStreams: [{ name: 'Kibana server logs', title: 'kibana-*' }],
    },
  ],
  isLoadingIntegrations: false,
  isLoadingStreams: false,
  onIntegrationsLoadMore: () => console.log('Loading more integrations...'),
  onSearch: (params) => console.log('Search integrations by: ', params),
  onStreamSelected: (stream) => console.log('Create ad hoc view for stream: ', stream),
  onStreamsEntryClick: () => console.log('Load uncategorized streams...'),
  onStreamsReload: () => console.log('Reloading streams...'),
  onStreamsSearch: (params) => console.log('Search streams by: ', params),
  search: {
    sortOrder: 'asc',
    name: '',
  },
};
