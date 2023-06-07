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
    name: 'apm',
    version: '8.9.0-SNAPSHOT',
    status: 'installed',
    dataStreams: [
      {
        name: 'logs-apm.app.*-*',
        title: 'app_logs',
      },
      {
        name: 'logs-apm.error-*',
        title: 'error_logs',
      },
    ],
  },
  {
    name: 'cloud_security_posture',
    version: '1.3.0',
    status: 'installed',
    dataStreams: [
      {
        name: 'logs-cloud_security_posture.findings-*',
        title: 'findings',
      },
    ],
  },
  {
    name: 'elastic_agent',
    version: '1.8.0',
    status: 'installed',
    dataStreams: [
      {
        name: 'logs-elastic_agent.apm_server-*',
        title: 'apm_server_logs',
      },
      {
        name: 'logs-elastic_agent.auditbeat-*',
        title: 'auditbeat_logs',
      },
      {
        name: 'logs-elastic_agent.cloud_defend-*',
        title: 'cloud_defend_logs',
      },
      {
        name: 'logs-elastic_agent.cloudbeat-*',
        title: 'cloudbeat_logs',
      },
      {
        name: 'logs-elastic_agent-*',
        title: 'elastic_agent_logs',
      },
      {
        name: 'logs-elastic_agent.endpoint_security-*',
        title: 'endpoint_sercurity_logs',
      },
      {
        name: 'logs-elastic_agent.filebeat_input-*',
        title: 'filebeat_input_logs',
      },
      {
        name: 'logs-elastic_agent.filebeat-*',
        title: 'filebeat_logs',
      },
      {
        name: 'logs-elastic_agent.fleet_server-*',
        title: 'fleet_server_logs',
      },
      {
        name: 'logs-elastic_agent.heartbeat-*',
        title: 'heartbeat_logs',
      },
      {
        name: 'logs-elastic_agent.metricbeat-*',
        title: 'metricbeat_logs',
      },
      {
        name: 'logs-elastic_agent.osquerybeat-*',
        title: 'osquerybeat_logs',
      },
      {
        name: 'logs-elastic_agent.packetbeat-*',
        title: 'packetbeat_logs',
      },
    ],
  },
  {
    name: 'endpoint',
    version: '8.8.0',
    status: 'installed',
    dataStreams: [
      {
        name: 'logs-endpoint.alerts-*',
        title: 'alerts',
      },
      {
        name: 'logs-endpoint.events.api-*',
        title: 'api',
      },
      {
        name: 'logs-endpoint.events.file-*',
        title: 'file',
      },
      {
        name: 'logs-endpoint.events.library-*',
        title: 'library',
      },
      {
        name: 'logs-endpoint.events.network-*',
        title: 'network',
      },
      {
        name: 'logs-endpoint.events.process-*',
        title: 'process',
      },
      {
        name: 'logs-endpoint.events.registry-*',
        title: 'registry',
      },
      {
        name: 'logs-endpoint.events.security-*',
        title: 'security',
      },
    ],
  },
  {
    name: 'kubernetes',
    version: '1.41.0',
    status: 'installed',
    dataStreams: [
      {
        name: 'logs-kubernetes.audit_logs-*',
        title: 'audit_logs',
      },
      {
        name: 'logs-kubernetes.container_logs-*',
        title: 'container_logs',
      },
    ],
  },
  {
    name: 'log',
    version: '2.0.0',
    status: 'installed',
    dataStreams: [],
  },
  {
    name: 'network_traffic',
    version: '1.18.0',
    status: 'installed',
    dataStreams: [
      {
        name: 'logs-network_traffic.amqp-*',
        title: 'amqp',
      },
      {
        name: 'logs-network_traffic.cassandra-*',
        title: 'cassandra',
      },
      {
        name: 'logs-network_traffic.dhcpv4-*',
        title: 'dhcpv4',
      },
      {
        name: 'logs-network_traffic.dns-*',
        title: 'dns',
      },
      {
        name: 'logs-network_traffic.flow-*',
        title: 'flow',
      },
      {
        name: 'logs-network_traffic.http-*',
        title: 'http',
      },
      {
        name: 'logs-network_traffic.icmp-*',
        title: 'icmp',
      },
      {
        name: 'logs-network_traffic.memcached-*',
        title: 'memcached',
      },
      {
        name: 'logs-network_traffic.mongodb-*',
        title: 'mongodb',
      },
      {
        name: 'logs-network_traffic.mysql-*',
        title: 'mysql',
      },
      {
        name: 'logs-network_traffic.nfs-*',
        title: 'nfs',
      },
      {
        name: 'logs-network_traffic.pgsql-*',
        title: 'pgsql',
      },
      {
        name: 'logs-network_traffic.redis-*',
        title: 'redis',
      },
      {
        name: 'logs-network_traffic.sip-*',
        title: 'sip',
      },
      {
        name: 'logs-network_traffic.thrift-*',
        title: 'thrift',
      },
      {
        name: 'logs-network_traffic.tls-*',
        title: 'tls',
      },
    ],
  },
  {
    name: 'system',
    version: '1.31.1',
    status: 'installed',
    dataStreams: [
      {
        name: 'logs-system.application-*',
        title: 'application',
      },
      {
        name: 'logs-system.auth-*',
        title: 'auth',
      },
      {
        name: 'logs-system.security-*',
        title: 'security',
      },
      {
        name: 'logs-system.syslog-*',
        title: 'syslog',
      },
      {
        name: 'logs-system.system-*',
        title: 'system',
      },
    ],
  },
];

const streams = [
  {
    name: 'logs-1password.item_usages-default',
  },
  {
    name: 'logs-1password.signin_attempts-default',
  },
  {
    name: 'logs-apache.access-default',
  },
  {
    name: 'logs-apache.error-default',
  },
  {
    name: 'logs-apm.app-default',
  },
  {
    name: 'logs-apm.error-default',
  },
  {
    name: 'logs-elastic_agent-default',
  },
  {
    name: 'logs-elastic_agent.apm_server-default',
  },
  {
    name: 'logs-elastic_agent.endpoint_security-default',
  },
  {
    name: 'logs-elastic_agent.filebeat-default',
  },
  {
    name: 'logs-elastic_agent.heartbeat-default',
  },
  {
    name: 'logs-elastic_agent.metricbeat-default',
  },
  {
    name: 'logs-endpoint.alerts-default',
  },
  {
    name: 'logs-endpoint.events.api-default',
  },
  {
    name: 'logs-endpoint.events.file-default',
  },
  {
    name: 'logs-endpoint.events.library-default',
  },
  {
    name: 'logs-endpoint.events.network-default',
  },
  {
    name: 'logs-endpoint.events.process-default',
  },
  {
    name: 'logs-endpoint.events.registry-default',
  },
  {
    name: 'logs-endpoint.events.security-default',
  },
  {
    name: 'logs-felixbarny-default',
  },
  {
    name: 'logs-generic-pods-default',
  },
  {
    name: 'logs-mydata-default',
  },
  {
    name: 'logs-system.application-default',
  },
  {
    name: 'logs-system.auth-default',
  },
  {
    name: 'logs-system.security-default',
  },
  {
    name: 'logs-system.syslog-default',
  },
  {
    name: 'logs-system.system-default',
  },
];
