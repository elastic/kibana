/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { Meta, Story } from '@storybook/react';
import { IndexPattern } from '@kbn/io-ts-utils';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { DataViewDescriptor } from '../../../common/data_views/models/data_view_descriptor';
import {
  AllDatasetSelection,
  DataSourceSelectionChangeHandler,
  DataSourceSelection,
} from '../../../common/data_source_selection';
import { Dataset, Integration } from '../../../common/datasets';
import { DataSourceSelector } from './data_source_selector';
import { DataSourceSelectorProps, DataSourceSelectorSearchParams } from './types';
import { IsDataViewAvailable } from '../../hooks/use_data_views';

const meta: Meta<typeof DataSourceSelector> = {
  component: DataSourceSelector,
  title: 'logs_explorer/DataSourceSelector',
  decorators: [(wrappedStory) => <I18nProvider>{wrappedStory()}</I18nProvider>],
  argTypes: {
    datasetsError: {
      options: [null, { message: 'Failed to fetch data streams' }],
      control: { type: 'radio' },
    },
    dataViewsError: {
      options: [null, { message: 'Failed to fetch data data views' }],
      control: { type: 'radio' },
    },
    integrationsError: {
      options: [null, { message: 'Failed to fetch data integrations' }],
      control: { type: 'radio' },
    },
  },
};
export default meta;

const coreMock = {
  share: {
    url: {
      locators: {
        get: () => {
          return {
            useUrl: () => 'http://localhost:5601/app/logs-explorer',
            navigate: () => {},
          };
        },
      },
    },
  },
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext(coreMock);

const DataSourceSelectorTemplate: Story<DataSourceSelectorProps> = (args) => {
  const [dataSourceSelection, setDataSourceSelection] = useState<DataSourceSelection>(() =>
    AllDatasetSelection.create()
  );

  const [search, setSearch] = useState<DataSourceSelectorSearchParams>({
    sortOrder: 'asc',
    name: '',
  });
  const [integrations, setIntegrations] = useState(() => mockIntegrations.slice(0, 10));

  const onIntegrationsLoadMore = () => {
    if (integrations.length < mockIntegrations.length) {
      setIntegrations((prev) => prev.concat(mockIntegrations.slice(prev.length, prev.length + 10)));
    }
  };

  const onSelectionChange: DataSourceSelectionChangeHandler = (newSelection) => {
    setDataSourceSelection(newSelection);
  };

  const isDataViewAvailable: IsDataViewAvailable = (dataView) => {
    return true;
  };

  const filteredIntegrations = integrations.filter((integration) =>
    integration.name.includes(search.name as string)
  );

  const sortedIntegrations =
    search.sortOrder === 'asc' ? filteredIntegrations : filteredIntegrations.reverse();

  const filteredDatasets = mockDatasets.filter((dataset) =>
    dataset.name.includes(search.name as string)
  );

  const sortedDatasets = search.sortOrder === 'asc' ? filteredDatasets : filteredDatasets.reverse();

  const filteredDataViews = mockDataViews.filter((dataView) =>
    dataView.name?.includes(search.name as string)
  );

  const sortedDataViews =
    search.sortOrder === 'asc' ? filteredDataViews : filteredDataViews.reverse();

  const {
    datasetsError,
    dataViewsError,
    integrationsError,
    isLoadingDataViews,
    isLoadingIntegrations,
    isLoadingUncategorized,
  } = args;

  return (
    <KibanaReactContext.Provider>
      <DataSourceSelector
        {...args}
        datasets={Boolean(datasetsError || isLoadingUncategorized) ? [] : sortedDatasets}
        dataViews={Boolean(dataViewsError || isLoadingDataViews) ? [] : sortedDataViews}
        dataSourceSelection={dataSourceSelection}
        integrations={Boolean(integrationsError || isLoadingIntegrations) ? [] : sortedIntegrations}
        isDataViewAvailable={isDataViewAvailable}
        onDataViewsSearch={setSearch}
        onDataViewsSort={setSearch}
        onIntegrationsLoadMore={onIntegrationsLoadMore}
        onIntegrationsSearch={setSearch}
        onIntegrationsSort={setSearch}
        onSelectionChange={onSelectionChange}
        onUncategorizedSearch={setSearch}
      />
    </KibanaReactContext.Provider>
  );
};

export const Basic = DataSourceSelectorTemplate.bind({});
Basic.args = {
  datasetsError: null,
  dataViewsError: null,
  integrationsError: null,
  isLoadingDataViews: false,
  isLoadingIntegrations: false,
  isLoadingUncategorized: false,
  isSearchingIntegrations: false,
  isDataViewAllowed: () => true,
  onDataViewsReload: () => alert('Reload data views...'),
  onDataViewsTabClick: () => console.log('Load data views...'),
  onIntegrationsReload: () => alert('Reload integrations...'),
  onUncategorizedLoad: () => console.log('Load uncategorized streams...'),
  onUncategorizedReload: () => alert('Reloading streams...'),
};

const mockIntegrations: Integration[] = [
  {
    name: 'system',
    version: '1.25.2',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'System metrics stream',
        name: 'system-metrics-*' as IndexPattern,
      },
      {
        title: 'System logs stream',
        name: 'system-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'kubernetes',
    version: '1.35.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'Kubernetes metrics stream',
        name: 'k8s-metrics-*' as IndexPattern,
      },
      {
        title: 'Kubernetes logs stream',
        name: 'k8s-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'mysql',
    version: '1.11.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'MySQL metrics stream',
        name: 'mysql-metrics-*' as IndexPattern,
      },
      {
        title: 'MySQL slow logs stream',
        name: 'mysql-slow-logs-*' as IndexPattern,
      },
      {
        title: 'MySQL error logs stream',
        name: 'mysql-error-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'apache',
    version: '1.12.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'Apache metrics stream',
        name: 'apache-metrics-*' as IndexPattern,
      },
      {
        title: 'Apache logs stream',
        name: 'apache-logs-*' as IndexPattern,
      },
      {
        title: 'Apache error logs stream',
        name: 'apache-error-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'nginx',
    version: '1.11.1',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'Nginx metrics stream',
        name: 'nginx-metrics-*' as IndexPattern,
      },
      {
        title: 'Nginx access logs stream',
        name: 'nginx-access-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'postgresql',
    version: '1.13.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'PostgreSQL metrics stream',
        name: 'postgresql-metrics-*' as IndexPattern,
      },
      {
        title: 'PostgreSQL slow query logs stream',
        name: 'postgresql-slow-query-logs-*' as IndexPattern,
      },
      {
        title: 'PostgreSQL error logs stream',
        name: 'postgresql-error-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'rabbitmq',
    version: '1.8.8',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'RabbitMQ metrics stream',
        name: 'rabbitmq-metrics-*' as IndexPattern,
      },
      {
        title: 'RabbitMQ queues stream',
        name: 'rabbitmq-queues-*' as IndexPattern,
      },
      {
        title: 'RabbitMQ error logs stream',
        name: 'rabbitmq-error-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'redis',
    version: '1.9.2',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'Redis metrics stream',
        name: 'redis-metrics-*' as IndexPattern,
      },
      {
        title: 'Redis slow logs stream',
        name: 'redis-slow-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'elasticsearch',
    version: '1.5.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'Elasticsearch metrics stream',
        name: 'elasticsearch-metrics-*' as IndexPattern,
      },
      {
        title: 'Elasticsearch indices stream',
        name: 'elasticsearch-indices-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'mongodb',
    version: '1.9.3',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'MongoDB metrics stream',
        name: 'mongodb-metrics-*' as IndexPattern,
      },
      {
        title: 'MongoDB slow query logs stream',
        name: 'mongodb-slow-query-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'prometheus',
    version: '1.3.2',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'Prometheus metrics stream',
        name: 'prometheus-metrics-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'haproxy',
    version: '1.5.1',
    status: 'installed' as Integration['status'],
    dataStreams: [
      {
        title: 'HAProxy metrics stream',
        name: 'haproxy-metrics-*' as IndexPattern,
      },
      {
        title: 'HAProxy logs stream',
        name: 'haproxy-logs-*' as IndexPattern,
      },
    ],
  },
  {
    name: 'atlassian_jira',
    version: '1.10.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' as IndexPattern },
      { title: 'Atlassian secondary', name: 'metrics-*' as IndexPattern },
    ],
  },
  {
    name: 'atlassian_confluence',
    version: '1.10.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' as IndexPattern },
      { title: 'Atlassian secondary', name: 'metrics-*' as IndexPattern },
    ],
  },
  {
    name: 'atlassian_bitbucket',
    version: '1.9.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' as IndexPattern },
      { title: 'Atlassian secondary', name: 'metrics-*' as IndexPattern },
    ],
  },
  {
    name: 'docker',
    version: '2.4.3',
    status: 'installed' as Integration['status'],
    dataStreams: [
      { title: 'Docker container logs', name: 'docker-*' as IndexPattern },
      { title: 'Docker daemon logs', name: 'docker-daemon-*' as IndexPattern },
    ],
  },
  {
    name: 'aws',
    version: '1.36.3',
    status: 'installed' as Integration['status'],
    dataStreams: [
      { title: 'AWS S3 object access logs', name: 'aws-s3-access-' as IndexPattern },
      { title: 'AWS S3 bucket access logs', name: 'aws-s3-bucket-access-' as IndexPattern },
    ],
  },
  {
    name: 'cassandra',
    version: '1.6.0',
    status: 'installed' as Integration['status'],
    dataStreams: [
      { title: 'Cassandra server logs', name: 'cassandra-' as IndexPattern },
      { title: 'Cassandra slow queries', name: 'cassandra-slow-' as IndexPattern },
      { title: 'Cassandra errors', name: 'cassandra-errors-' as IndexPattern },
    ],
  },
  {
    name: 'nginx_ingress_controller',
    version: '1.7.1',
    status: 'installed' as Integration['status'],
    dataStreams: [{ title: 'Nginx ingress logs', name: 'nginx-ingress-' as IndexPattern }],
  },
  {
    name: 'gcp',
    version: '2.20.1',
    status: 'installed' as Integration['status'],
    dataStreams: [{ title: 'GCP Stackdriver logs', name: 'gcp-stackdriver-*' as IndexPattern }],
  },
  {
    name: 'kafka',
    version: '1.5.6',
    status: 'installed' as Integration['status'],
    dataStreams: [{ title: 'Kafka server logs', name: 'kafka-*' as IndexPattern }],
  },
  {
    name: 'kibana',
    version: '2.3.4',
    status: 'installed' as Integration['status'],
    dataStreams: [{ title: 'Kibana server logs', name: 'kibana-*' as IndexPattern }],
  },
].map(Integration.create);

const mockDatasets: Dataset[] = [
  { name: 'logs-*' as IndexPattern },
  { name: 'system-logs-*' as IndexPattern },
  { name: 'nginx-logs-*' as IndexPattern },
  { name: 'apache-logs-*' as IndexPattern },
  { name: 'security-logs-*' as IndexPattern },
  { name: 'error-logs-*' as IndexPattern },
  { name: 'access-logs-*' as IndexPattern },
  { name: 'firewall-logs-*' as IndexPattern },
  { name: 'application-logs-*' as IndexPattern },
  { name: 'debug-logs-*' as IndexPattern },
  { name: 'transaction-logs-*' as IndexPattern },
  { name: 'audit-logs-*' as IndexPattern },
  { name: 'server-logs-*' as IndexPattern },
  { name: 'database-logs-*' as IndexPattern },
  { name: 'event-logs-*' as IndexPattern },
  { name: 'auth-logs-*' as IndexPattern },
  { name: 'billing-logs-*' as IndexPattern },
  { name: 'network-logs-*' as IndexPattern },
  { name: 'performance-logs-*' as IndexPattern },
  { name: 'email-logs-*' as IndexPattern },
  { name: 'job-logs-*' as IndexPattern },
  { name: 'task-logs-*' as IndexPattern },
  { name: 'user-logs-*' as IndexPattern },
  { name: 'request-logs-*' as IndexPattern },
  { name: 'payment-logs-*' as IndexPattern },
  { name: 'inventory-logs-*' as IndexPattern },
  { name: 'debugging-logs-*' as IndexPattern },
  { name: 'scheduler-logs-*' as IndexPattern },
  { name: 'diagnostic-logs-*' as IndexPattern },
  { name: 'cluster-logs-*' as IndexPattern },
  { name: 'service-logs-*' as IndexPattern },
  { name: 'framework-logs-*' as IndexPattern },
  { name: 'api-logs-*' as IndexPattern },
  { name: 'load-balancer-logs-*' as IndexPattern },
  { name: 'reporting-logs-*' as IndexPattern },
  { name: 'backend-logs-*' as IndexPattern },
  { name: 'frontend-logs-*' as IndexPattern },
  { name: 'chat-logs-*' as IndexPattern },
  { name: 'error-tracking-logs-*' as IndexPattern },
  { name: 'payment-gateway-logs-*' as IndexPattern },
  { name: 'auth-service-logs-*' as IndexPattern },
  { name: 'billing-service-logs-*' as IndexPattern },
  { name: 'database-service-logs-*' as IndexPattern },
  { name: 'api-gateway-logs-*' as IndexPattern },
  { name: 'event-service-logs-*' as IndexPattern },
  { name: 'notification-service-logs-*' as IndexPattern },
  { name: 'search-service-logs-*' as IndexPattern },
  { name: 'logging-service-logs-*' as IndexPattern },
  { name: 'performance-service-logs-*' as IndexPattern },
  { name: 'load-testing-logs-*' as IndexPattern },
  { name: 'mobile-app-logs-*' as IndexPattern },
  { name: 'web-app-logs-*' as IndexPattern },
  { name: 'stream-processing-logs-*' as IndexPattern },
  { name: 'batch-processing-logs-*' as IndexPattern },
  { name: 'cloud-service-logs-*' as IndexPattern },
  { name: 'container-logs-*' as IndexPattern },
  { name: 'serverless-logs-*' as IndexPattern },
  { name: 'server-administration-logs-*' as IndexPattern },
  { name: 'application-deployment-logs-*' as IndexPattern },
  { name: 'webserver-logs-*' as IndexPattern },
  { name: 'payment-processor-logs-*' as IndexPattern },
  { name: 'inventory-service-logs-*' as IndexPattern },
  { name: 'data-pipeline-logs-*' as IndexPattern },
  { name: 'frontend-service-logs-*' as IndexPattern },
  { name: 'backend-service-logs-*' as IndexPattern },
  { name: 'resource-monitoring-logs-*' as IndexPattern },
  { name: 'logging-aggregation-logs-*' as IndexPattern },
  { name: 'container-orchestration-logs-*' as IndexPattern },
  { name: 'security-audit-logs-*' as IndexPattern },
  { name: 'api-management-logs-*' as IndexPattern },
  { name: 'service-mesh-logs-*' as IndexPattern },
  { name: 'data-processing-logs-*' as IndexPattern },
  { name: 'data-science-logs-*' as IndexPattern },
  { name: 'machine-learning-logs-*' as IndexPattern },
  { name: 'experimentation-logs-*' as IndexPattern },
  { name: 'data-visualization-logs-*' as IndexPattern },
  { name: 'data-cleaning-logs-*' as IndexPattern },
  { name: 'data-transformation-logs-*' as IndexPattern },
  { name: 'data-analysis-logs-*' as IndexPattern },
  { name: 'data-storage-logs-*' as IndexPattern },
  { name: 'data-retrieval-logs-*' as IndexPattern },
  { name: 'data-warehousing-logs-*' as IndexPattern },
  { name: 'data-modeling-logs-*' as IndexPattern },
  { name: 'data-integration-logs-*' as IndexPattern },
  { name: 'data-quality-logs-*' as IndexPattern },
  { name: 'data-security-logs-*' as IndexPattern },
  { name: 'data-encryption-logs-*' as IndexPattern },
  { name: 'data-governance-logs-*' as IndexPattern },
  { name: 'data-compliance-logs-*' as IndexPattern },
  { name: 'data-privacy-logs-*' as IndexPattern },
  { name: 'data-auditing-logs-*' as IndexPattern },
  { name: 'data-discovery-logs-*' as IndexPattern },
  { name: 'data-protection-logs-*' as IndexPattern },
  { name: 'data-archiving-logs-*' as IndexPattern },
  { name: 'data-backup-logs-*' as IndexPattern },
  { name: 'data-recovery-logs-*' as IndexPattern },
  { name: 'data-replication-logs-*' as IndexPattern },
  { name: 'data-synchronization-logs-*' as IndexPattern },
  { name: 'data-migration-logs-*' as IndexPattern },
  { name: 'data-load-balancing-logs-*' as IndexPattern },
  { name: 'data-scaling-logs-*' as IndexPattern },
].map((dataset) => Dataset.create(dataset));

const mockDataViews: DataViewDescriptor[] = [
  {
    id: 'logs-*',
    namespaces: ['default'],
    title: 'logs-*',
    name: 'logs-*',
  },
  {
    id: 'metrics-*',
    namespaces: ['default'],
    title: 'metrics-*',
    name: 'metrics-*',
  },
  {
    id: '7258d186-6430-4b51-bb67-2603cdfb4652',
    namespaces: ['default'],
    title: 'synthetics-*',
    typeMeta: {},
    name: 'synthetics-dashboard',
  },
].map((dataView) => DataViewDescriptor.create(dataView));
