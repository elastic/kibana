/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable prefer-const */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { FindIntegrationsRequestQuery } from '../../common';

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/fleet/epm/packages/installed',
      validate: {
        query: schema.object({
          dataStreamType: schema.maybe(
            schema.oneOf([
              schema.literal('logs'),
              schema.literal('metrics'),
              schema.literal('traces'),
              schema.literal('synthetics'),
              schema.literal('profiling'),
            ])
          ),
          nameQuery: schema.maybe(schema.string()),
          searchAfter: schema.maybe(
            schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))
          ),
          perPage: schema.number({ defaultValue: 10 }),
          sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
            defaultValue: 'asc',
          }),
        }),
      },
    },
    async (_context, request, response) => {
      await new Promise((res) => setTimeout(res, 500));
      let {
        nameQuery = '',
        perPage = 10,
        searchAfter = '',
        sortOrder,
      } = request.query as FindIntegrationsRequestQuery;

      let filteredPackages = items.filter((pkg) => pkg.name.includes(nameQuery));
      if (sortOrder === 'desc') {
        filteredPackages.sort((a, b) => b.name.localeCompare(a.name));
      } else {
        filteredPackages.sort((a, b) => a.name.localeCompare(b.name));
      }

      const searchAfterIndex = searchAfter[0]
        ? filteredPackages.findIndex((pkg) => pkg.name === searchAfter[0])
        : -1;
      if (searchAfterIndex >= 0) {
        filteredPackages = filteredPackages.slice(
          searchAfterIndex + 1,
          searchAfterIndex + perPage + 1
        );
      } else {
        filteredPackages = filteredPackages.slice(0, perPage);
      }

      return response.ok({
        body: {
          total: items.length,
          searchAfter: filteredPackages.length
            ? [filteredPackages[filteredPackages.length - 1].name]
            : undefined,
          items: filteredPackages,
        },
      });
    }
  );

  router.get(
    {
      path: '/api/fleet/epm/data_streams',
      validate: {
        query: schema.object({
          type: schema.maybe(
            schema.oneOf([
              schema.literal('logs'),
              schema.literal('metrics'),
              schema.literal('traces'),
              schema.literal('synthetics'),
              schema.literal('profiling'),
            ])
          ),
          datasetQuery: schema.maybe(schema.string()),
          sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
            defaultValue: 'asc',
          }),
          uncategorisedOnly: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (_context, request, response) => {
      await new Promise((res) => setTimeout(res, 1000));
      const { datasetQuery = '', sortOrder } = request.query;

      const filteredPackages = streams.filter((pkg) => pkg.name.includes(datasetQuery));
      if (sortOrder === 'desc') {
        filteredPackages.sort((a, b) => b.name.localeCompare(a.name));
      } else {
        filteredPackages.sort((a, b) => a.name.localeCompare(b.name));
      }

      return response.ok({
        body: {
          items: filteredPackages,
        },
      });
    }
  );
}

const items = [
  {
    name: 'system',
    version: '1.25.2',
    status: 'installed',
    dataStreams: [
      {
        title: 'System metrics stream',
        name: 'system-metrics-*',
      },
      {
        title: 'System logs stream',
        name: 'system-logs-*',
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
        name: 'k8s-metrics-*',
      },
      {
        title: 'Kubernetes logs stream',
        name: 'k8s-logs-*',
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
        name: 'mysql-metrics-*',
      },
      {
        title: 'MySQL slow logs stream',
        name: 'mysql-slow-logs-*',
      },
      {
        title: 'MySQL error logs stream',
        name: 'mysql-error-logs-*',
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
        name: 'apache-metrics-*',
      },
      {
        title: 'Apache logs stream',
        name: 'apache-logs-*',
      },
      {
        title: 'Apache error logs stream',
        name: 'apache-error-logs-*',
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
        name: 'nginx-metrics-*',
      },
      {
        title: 'Nginx access logs stream',
        name: 'nginx-access-logs-*',
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
        name: 'postgresql-metrics-*',
      },
      {
        title: 'PostgreSQL slow query logs stream',
        name: 'postgresql-slow-query-logs-*',
      },
      {
        title: 'PostgreSQL error logs stream',
        name: 'postgresql-error-logs-*',
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
        name: 'rabbitmq-metrics-*',
      },
      {
        title: 'RabbitMQ queues stream',
        name: 'rabbitmq-queues-*',
      },
      {
        title: 'RabbitMQ error logs stream',
        name: 'rabbitmq-error-logs-*',
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
        name: 'redis-metrics-*',
      },
      {
        title: 'Redis slow logs stream',
        name: 'redis-slow-logs-*',
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
        name: 'elasticsearch-metrics-*',
      },
      {
        title: 'Elasticsearch indices stream',
        name: 'elasticsearch-indices-*',
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
        name: 'mongodb-metrics-*',
      },
      {
        title: 'MongoDB slow query logs stream',
        name: 'mongodb-slow-query-logs-*',
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
        name: 'prometheus-metrics-*',
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
        name: 'haproxy-metrics-*',
      },
      {
        title: 'HAProxy logs stream',
        name: 'haproxy-logs-*',
      },
    ],
  },
  {
    name: 'atlassian_jira',
    version: '1.10.0',
    status: 'installed',
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' },
      { title: 'Atlassian secondary', name: 'metrics-*' },
    ],
  },
  {
    name: 'atlassian_confluence',
    version: '1.10.0',
    status: 'installed',
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' },
      { title: 'Atlassian secondary', name: 'metrics-*' },
    ],
  },
  {
    name: 'atlassian_bitbucket',
    version: '1.9.0',
    status: 'installed',
    dataStreams: [
      { title: 'Atlassian metrics stream', name: 'metrics-*' },
      { title: 'Atlassian secondary', name: 'metrics-*' },
    ],
  },
  {
    name: 'docker',
    version: '2.4.3',
    status: 'installed',
    dataStreams: [
      { title: 'Docker container logs', name: 'docker-*' },
      { title: 'Docker daemon logs', name: 'docker-daemon-*' },
    ],
  },
  {
    name: 'aws',
    version: '1.36.3',
    status: 'installed',
    dataStreams: [
      { title: 'AWS S3 object access logs', name: 'aws-s3-access-' },
      { title: 'AWS S3 bucket access logs', name: 'aws-s3-bucket-access-' },
    ],
  },
  {
    name: 'cassandra',
    version: '1.6.0',
    status: 'installed',
    dataStreams: [
      { title: 'Cassandra server logs', name: 'cassandra-' },
      { title: 'Cassandra slow queries', name: 'cassandra-slow-' },
      { title: 'Cassandra errors', name: 'cassandra-errors-' },
    ],
  },
  {
    name: 'nginx_ingress_controller',
    version: '1.7.1',
    status: 'installed',
    dataStreams: [{ title: 'Nginx ingress logs', name: 'nginx-ingress-' }],
  },
  {
    name: 'gcp',
    version: '2.20.1',
    status: 'installed',
    dataStreams: [{ title: 'GCP Stackdriver logs', name: 'gcp-stackdriver-*' }],
  },
  {
    name: 'kafka',
    version: '1.5.6',
    status: 'installed',
    dataStreams: [{ title: 'Kafka server logs', name: 'kafka-*' }],
  },
  {
    name: 'kibana',
    version: '2.3.4',
    status: 'installed',
    dataStreams: [{ title: 'Kibana server logs', name: 'kibana-*' }],
  },
];

const streams = [
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
];
