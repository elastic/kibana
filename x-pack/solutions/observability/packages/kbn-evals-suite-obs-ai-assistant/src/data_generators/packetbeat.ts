/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Client } from '@elastic/elasticsearch';

/**
 * Generates a variety of sample Packetbeat documents.
 */
export async function generatePacketbeatData({
  esClient,
  indexName,
}: {
  esClient: Client;
  indexName: string;
}) {
  await esClient.indices.create({
    index: indexName,
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
        },
        destination: {
          type: 'object',
          properties: {
            domain: {
              type: 'keyword',
            },
          },
        },
        url: {
          type: 'object',
          properties: {
            domain: {
              type: 'keyword',
            },
          },
        },
      },
    },
  });

  const now = moment();
  const docs = [
    // Successful HTTP Traffic
    {
      '@timestamp': now.clone().subtract(5, 'minutes').toISOString(),
      event: { category: 'network' },
      client: { ip: '192.168.1.10' },
      server: { ip: '10.0.0.1' },
      http: { response: { status_code: 200 } },
      destination: { bytes: 1500, domain: 'service-a.internal' },
      source: { bytes: 250 },
    },
    {
      '@timestamp': now.clone().subtract(6, 'minutes').toISOString(),
      event: { category: 'network' },
      client: { ip: '192.168.1.10' },
      server: { ip: '10.0.0.2' },
      http: { response: { status_code: 200 } },
      destination: { bytes: 2200, domain: 'service-b.internal' },
      source: { bytes: 300 },
    },

    // HTTP Errors
    {
      '@timestamp': now.clone().subtract(10, 'minutes').toISOString(),
      event: { category: 'network' },
      client: { ip: '192.168.1.12' },
      server: { ip: '10.0.0.1' },
      http: { response: { status_code: 404 } },
      destination: { bytes: 100, domain: 'service-a.internal' },
      source: { bytes: 50 },
    },
    {
      '@timestamp': now.clone().subtract(11, 'minutes').toISOString(),
      event: { category: 'network' },
      client: { ip: '192.168.1.10' },
      server: { ip: '10.0.0.3' },
      http: { response: { status_code: 503 } },
      destination: { bytes: 120, domain: 'service-c.internal' },
      source: { bytes: 60 },
    },
    {
      '@timestamp': now.clone().subtract(12, 'minutes').toISOString(),
      event: { category: 'network' },
      client: { ip: '192.168.1.12' },
      server: { ip: '10.0.0.3' },
      http: { response: { status_code: 503 } },
      destination: { bytes: 130, domain: 'service-c.internal' },
      source: { bytes: 70 },
    },

    // DNS Queries
    {
      '@timestamp': now.clone().subtract(15, 'minutes').toISOString(),
      event: { category: 'network' },
      dns: { question: { name: 'www.elastic.co' }, response_code: 'NOERROR' },
    },
    {
      '@timestamp': now.clone().subtract(16, 'minutes').toISOString(),
      event: { category: 'network' },
      dns: { question: { name: 'www.google.com' }, response_code: 'NOERROR' },
    },
    {
      '@timestamp': now.clone().subtract(17, 'minutes').toISOString(),
      event: { category: 'network' },
      dns: { question: { name: 'nonexistent.domain.xyz' }, response_code: 'NXDomain' },
    },
    {
      '@timestamp': now.clone().subtract(18, 'minutes').toISOString(),
      event: { category: 'network' },
      dns: { question: { name: 'www.elastic.co' }, response_code: 'NOERROR' },
    },
  ];

  const body = docs.flatMap((doc) => [{ index: { _index: indexName } }, doc]);

  await esClient.bulk({
    refresh: true,
    body,
  });
}
