/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  FindDataStreamsRequestQuery,
  findDataStreamsRequestQueryRT,
  FindDataStreamsResponse,
  findDataStreamsResponseRT,
  FindIntegrationsRequestQuery,
  findIntegrationsRequestQueryRT,
  FindIntegrationsResponse,
  findIntegrationsResponseRT,
  getDataStreamsUrl,
  getIntegrationsUrl,
} from '../../../common';

import { IDataStreamsClient } from './types';

export class DataStreamsClient implements IDataStreamsClient {
  constructor(private readonly http: HttpStart) {}

  public async findIntegrations(
    params: FindIntegrationsRequestQuery = {}
  ): Promise<FindIntegrationsResponse> {
    const search = decodeOrThrow(
      findIntegrationsRequestQueryRT,
      (message: string) => new Error(`Failed to decode integrations search param: ${message}"`)
    )(params);

    const response = this.http.get(getIntegrationsUrl(search)).catch((error) => {
      throw new Error(`Failed to fetch integrations": ${error}`);
    });

    const data = decodeOrThrow(
      findIntegrationsResponseRT,
      (message: string) => new Error(`Failed to decode integrations response: ${message}"`)
    )(mockIntegrationsResponse); // TODO: switch with response

    return data;
  }

  public async findDataStreams(
    params: FindDataStreamsRequestQuery = {}
  ): Promise<FindDataStreamsResponse> {
    const search = decodeOrThrow(
      findDataStreamsRequestQueryRT,
      (message: string) => new Error(`Failed to decode data streams search param: ${message}"`)
    )(params);

    const response = await this.http.get(getDataStreamsUrl(search)).catch((error) => {
      throw new Error(`Failed to fetch data streams": ${error}`);
    });

    const data = decodeOrThrow(
      findDataStreamsResponseRT,
      (message: string) => new Error(`Failed to decode data streams response: ${message}"`)
    )(response);

    return data;
  }
}

const mockIntegrationsResponse = {
  total: 11,
  // searchAfter: undefined,
  items: [
    {
      name: 'kubernetes',
      version: '3.2.0',
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
      version: '4.6.1',
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
      version: '1.5.0',
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
      version: '1.2.0',
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
      version: '3.0.1',
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
      version: '4.3.2',
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
      version: '7.11.1',
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
      version: '3.6.1',
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
      version: '2.28.1',
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
      version: '1.7.5',
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
  ],
};
