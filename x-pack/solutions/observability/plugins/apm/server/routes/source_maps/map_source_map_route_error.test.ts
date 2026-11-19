/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { errors as EsErrors } from '@elastic/elasticsearch';
import {
  ArtifactsElasticsearchError,
  FleetError,
  PackageESError,
  PackagePolicyNotFoundError,
  PackagePolicyValidationError,
  RegistryConnectionError,
} from '@kbn/fleet-plugin/server/errors';
import { throwMappedSourceMapRouteError } from './map_source_map_route_error';

function createEsResponseError(statusCode: number, reason: string): EsErrors.ResponseError {
  return new EsErrors.ResponseError({
    body: { error: { reason } },
    statusCode,
    headers: {},
    warnings: [],
    meta: {
      request: {
        params: {
          method: 'PUT',
          path: '/.fleet-artifacts/_doc/1',
          querystring: '',
          body: '',
        },
      },
    } as never,
  });
}

describe('throwMappedSourceMapRouteError', () => {
  const fallbackMessage = 'Something went wrong while creating a new source map';

  it('re-throws Boom errors with their original status code', () => {
    const conflict = Boom.conflict('Saved object conflict');

    expect(() => throwMappedSourceMapRouteError(conflict, fallbackMessage)).toThrow(conflict);
    expect(conflict.output.statusCode).toBe(409);
  });

  it('maps FleetNotFoundError subclasses to 404', () => {
    expect(() =>
      throwMappedSourceMapRouteError(
        new PackagePolicyNotFoundError('Package policy not found'),
        fallbackMessage
      )
    ).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 404 }),
        message: 'Package policy not found',
      })
    );
  });

  it('maps Fleet validation errors to 400', () => {
    expect(() =>
      throwMappedSourceMapRouteError(
        new PackagePolicyValidationError('Invalid package policy'),
        fallbackMessage
      )
    ).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 400 }),
        message: 'Invalid package policy',
      })
    );
  });

  it('maps generic FleetError to 400 (Fleet default)', () => {
    expect(() =>
      throwMappedSourceMapRouteError(new FleetError('fleet failed'), fallbackMessage)
    ).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 400 }),
        message: 'fleet failed',
      })
    );
  });

  it('maps Fleet package ES failures to 500', () => {
    expect(() =>
      throwMappedSourceMapRouteError(new PackageESError('package es failed'), fallbackMessage)
    ).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 500 }),
        message: 'package es failed',
      })
    );
  });

  it('maps Fleet registry connection failures to 502', () => {
    expect(() =>
      throwMappedSourceMapRouteError(
        new RegistryConnectionError('registry unreachable'),
        fallbackMessage
      )
    ).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 502 }),
        message: 'registry unreachable',
      })
    );
  });

  it('maps ArtifactsElasticsearchError with ES 4xx to that status code', () => {
    const esError = createEsResponseError(404, 'index_not_found_exception');

    expect(() =>
      throwMappedSourceMapRouteError(new ArtifactsElasticsearchError(esError), fallbackMessage)
    ).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 404 }),
      })
    );
  });

  it('keeps ArtifactsElasticsearchError with ES 5xx as internal 500', () => {
    const esError = createEsResponseError(503, 'unavailable');

    try {
      throwMappedSourceMapRouteError(new ArtifactsElasticsearchError(esError), fallbackMessage);
      fail('expected throw');
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true);
      expect((error as Boom.Boom).output.statusCode).toBe(500);
      expect((error as Boom.Boom).message).toContain(fallbackMessage);
    }
  });

  it('maps raw ES client 4xx errors to that status code', () => {
    const esError = createEsResponseError(409, 'conflict');

    expect(() => throwMappedSourceMapRouteError(esError, fallbackMessage)).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 409 }),
      })
    );
  });

  it('wraps unexpected errors as Boom.internal 500', () => {
    try {
      throwMappedSourceMapRouteError(new Error('boom'), fallbackMessage);
      fail('expected throw');
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true);
      expect((error as Boom.Boom).output.statusCode).toBe(500);
      expect((error as Boom.Boom).message).toContain(fallbackMessage);
    }
  });
});
