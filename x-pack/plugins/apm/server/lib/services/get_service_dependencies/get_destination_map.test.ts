/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { Connections } from './get_connections';
import { getDestinationMaps } from './get_destination_map';

describe('getDestintionMaps', () => {
  it('returns empty when connections are empty', () => {
    expect(getDestinationMaps([])).toEqual({});
  });

  it('returns the destination for on connection without service', () => {
    const connections = [
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql',
        [SPAN_ID]: '7098b4957bd11904',
        [SPAN_TYPE]: 'db',
        [SPAN_SUBTYPE]: 'postgresql',
      },
    ];
    expect(getDestinationMaps(connections)).toEqual({
      postgresql: {
        id: { 'span.destination.service.resource': 'postgresql' },
        span: {
          type: 'db',
          subtype: 'postgresql',
          destination: { service: { resource: 'postgresql' } },
        },
      },
    });
  });

  it('returns the destination for on connection with service', () => {
    const connections = [
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        [SPAN_ID]: 'b3c74623ee3951aa',
        [SPAN_TYPE]: 'ext',
        [SPAN_SUBTYPE]: 'http_rb',
        service: {
          name: 'opbeans-python',
          environment: 'production',
          agentName: 'python',
        },
      },
    ] as Connections;
    expect(getDestinationMaps(connections)).toEqual({
      'opbeans:3000': {
        id: {
          service: {
            name: 'opbeans-python',
            environment: 'production',
            agentName: 'python',
          },
        },
        span: {
          type: 'ext',
          subtype: 'http_rb',
          destination: { service: { resource: 'opbeans:3000' } },
        },
        service: { name: 'opbeans-python', environment: 'production' },
        agent: { name: 'python' },
      },
    });
  });

  it('return the destination for multiples connections', () => {
    const connections = [
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql',
        [SPAN_ID]: '7098b4957bd11904',
        [SPAN_TYPE]: 'db',
        [SPAN_SUBTYPE]: 'postgresql',
      },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        [SPAN_ID]: 'e059b19db88ad19a',
        [SPAN_TYPE]: 'ext',
        [SPAN_SUBTYPE]: 'http_rb',
        service: {
          name: 'opbeans-dotnet',
          environment: 'production',
          agentName: 'dotnet',
        },
      },
    ] as Connections;

    expect(getDestinationMaps(connections)).toEqual({
      postgresql: {
        id: { 'span.destination.service.resource': 'postgresql' },
        span: {
          type: 'db',
          subtype: 'postgresql',
          destination: { service: { resource: 'postgresql' } },
        },
      },
      'opbeans:3000': {
        id: {
          service: {
            name: 'opbeans-dotnet',
            environment: 'production',
            agentName: 'dotnet',
          },
        },
        span: {
          type: 'ext',
          subtype: 'http_rb',
          destination: { service: { resource: 'opbeans:3000' } },
        },
        service: { name: 'opbeans-dotnet', environment: 'production' },
        agent: { name: 'dotnet' },
      },
    });
  });
});
