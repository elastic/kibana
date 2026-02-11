/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyAssets, type Streams } from '@kbn/streams-schema';
import expect from '@kbn/expect';
import type { StreamsSupertestRepositoryClient } from './repository_client';

type StreamPutItem = Streams.WiredStream.UpsertRequest & {
  name: string;
};

const streams: StreamPutItem[] = [
  {
    name: 'logs',
    stream: {
      description: '',
      ingest: {
        lifecycle: { dsl: {} },
        processing: { steps: [] },
        settings: {},
        wired: {
          fields: {
            '@timestamp': {
              type: 'date',
            },
            'scope.name': {
              type: 'keyword',
            },
            trace_id: {
              type: 'keyword',
            },
            span_id: {
              type: 'keyword',
            },
            event_name: {
              type: 'keyword',
            },
            severity_text: {
              type: 'keyword',
            },
            'body.text': {
              type: 'match_only_text',
            },
            severity_number: {
              type: 'long',
            },
            'resource.attributes.host.name': {
              type: 'keyword',
            },
            'resource.attributes.service.name': {
              type: 'keyword',
            },
            'stream.name': {
              type: 'system',
            },
          },
          routing: [
            {
              destination: 'logs.test',
              where: {
                and: [
                  {
                    field: 'attributes.numberfield',
                    gt: 15,
                  },
                ],
              },
              status: 'enabled',
            },
            {
              destination: 'logs.test2',
              where: {
                and: [
                  {
                    field: 'attributes.field2',
                    eq: 'abc',
                  },
                ],
              },
              status: 'enabled',
            },
          ],
        },
        failure_store: {
          lifecycle: { enabled: { data_retention: '30d' } },
        },
      },
    },
    ...emptyAssets,
  },
  {
    name: 'logs.test',
    stream: {
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [] },
        settings: {},
        wired: {
          routing: [],
          fields: {
            'attributes.numberfield': {
              type: 'long',
            },
          },
        },
        failure_store: { inherit: {} },
      },
    },
    ...emptyAssets,
  },
  {
    name: 'logs.test2',
    stream: {
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        settings: {},
        processing: {
          steps: [
            {
              action: 'grok',
              from: 'body.text',
              patterns: ['%{NUMBER:attributes.numberfield}'],
              where: { always: {} },
            },
          ],
        },
        wired: {
          fields: {
            'attributes.field2': {
              type: 'keyword',
            },
          },
          routing: [],
        },
        failure_store: { inherit: {} },
      },
    },
    ...emptyAssets,
  },
  {
    name: 'logs.deeply.nested.streamname',
    stream: {
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        settings: {},
        processing: { steps: [] },
        wired: {
          fields: {
            'attributes.field2': {
              type: 'keyword',
            },
          },
          routing: [],
        },
        failure_store: { inherit: {} },
      },
    },
    ...emptyAssets,
  },
];

export async function createStreams(apiClient: StreamsSupertestRepositoryClient) {
  for (const { name, ...stream } of streams) {
    await apiClient
      .fetch('PUT /api/streams/{name} 2023-10-31', {
        params: {
          body: stream,
          path: { name },
        },
      })
      .expect(200)
      .then((response) => expect(response.body.acknowledged).to.eql(true));
  }
}
