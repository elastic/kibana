/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ScopedAnnotationsClient,
  WrappedElasticsearchClientError,
} from '@kbn/observability-plugin/server';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getServiceAnnotations } from '.';
import * as GetDerivedServiceAnnotations from './get_derived_service_annotations';
import * as GetStoredAnnotations from './get_stored_annotations';
import { Annotation, AnnotationType } from '../../../../common/annotations';
import { errors } from '@elastic/elasticsearch';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

describe('getServiceAnnotations', () => {
  const storedAnnotations = [
    {
      type: AnnotationType.VERSION,
      id: '1',
      '@timestamp': Date.now(),
      text: 'foo',
    },
  ] as Annotation[];

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('returns stored annotarions even though derived annotations throws an error', async () => {
    jest
      .spyOn(GetDerivedServiceAnnotations, 'getDerivedServiceAnnotations')
      .mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('BOOM'));
            }, 20);
          })
      );
    jest.spyOn(GetStoredAnnotations, 'getStoredAnnotations').mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(storedAnnotations);
          }, 10);
        })
    );

    const annotations = await getServiceAnnotations({
      serviceName: 'foo',
      environment: 'bar',
      searchAggregatedTransactions: false,
      start: Date.now(),
      end: Date.now(),
      client: {} as ElasticsearchClient,
      logger: {} as Logger,
      annotationsClient: {} as ScopedAnnotationsClient,
      apmEventClient: {} as APMEventClient,
    });
    expect(annotations).toEqual({
      annotations: storedAnnotations,
    });
  });

  it('returns stored annotarions even when derived annotations throws an error first', async () => {
    jest
      .spyOn(GetDerivedServiceAnnotations, 'getDerivedServiceAnnotations')
      .mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('BOOM'));
            }, 10);
          })
      );
    jest.spyOn(GetStoredAnnotations, 'getStoredAnnotations').mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(storedAnnotations);
          }, 20);
        })
    );

    const annotations = await getServiceAnnotations({
      serviceName: 'foo',
      environment: 'bar',
      searchAggregatedTransactions: false,
      start: Date.now(),
      end: Date.now(),
      client: {} as ElasticsearchClient,
      logger: {} as Logger,
      annotationsClient: {} as ScopedAnnotationsClient,
      apmEventClient: {} as APMEventClient,
    });
    expect(annotations).toEqual({
      annotations: storedAnnotations,
    });
  });

  it('Throws an exception when derived annotations fires an error before stored annotations is completed and return an empty array', async () => {
    jest
      .spyOn(GetDerivedServiceAnnotations, 'getDerivedServiceAnnotations')
      .mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('BOOM'));
            }, 10);
          })
      );
    jest.spyOn(GetStoredAnnotations, 'getStoredAnnotations').mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve([] as Annotation[]);
          }, 20);
        })
    );

    expect(
      getServiceAnnotations({
        serviceName: 'foo',
        environment: 'bar',
        searchAggregatedTransactions: false,
        start: Date.now(),
        end: Date.now(),
        client: {} as ElasticsearchClient,
        logger: {} as Logger,
        annotationsClient: {} as ScopedAnnotationsClient,
        apmEventClient: {} as APMEventClient,
      })
    ).rejects.toThrow('BOOM');
  });

  it('returns empty derived annotations when RequestAbortedError is thrown and stored annotations is empty', async () => {
    jest
      .spyOn(GetDerivedServiceAnnotations, 'getDerivedServiceAnnotations')
      .mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(
                new WrappedElasticsearchClientError(
                  new errors.RequestAbortedError('foo')
                )
              );
            }, 20);
          })
      );
    jest.spyOn(GetStoredAnnotations, 'getStoredAnnotations').mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve([] as Annotation[]);
          }, 10);
        })
    );

    const annotations = await getServiceAnnotations({
      serviceName: 'foo',
      environment: 'bar',
      searchAggregatedTransactions: false,
      start: Date.now(),
      end: Date.now(),
      client: {} as ElasticsearchClient,
      logger: {} as Logger,
      annotationsClient: {} as ScopedAnnotationsClient,
      apmEventClient: {} as APMEventClient,
    });
    expect(annotations).toEqual({ annotations: [] });
  });

  it('Throws an exception when derived annotations fires an error after stored annotations is completed and return an empty array', async () => {
    jest
      .spyOn(GetDerivedServiceAnnotations, 'getDerivedServiceAnnotations')
      .mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('BOOM'));
            }, 20);
          })
      );
    jest.spyOn(GetStoredAnnotations, 'getStoredAnnotations').mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve([] as Annotation[]);
          }, 10);
        })
    );

    expect(
      getServiceAnnotations({
        serviceName: 'foo',
        environment: 'bar',
        searchAggregatedTransactions: false,
        start: Date.now(),
        end: Date.now(),
        client: {} as ElasticsearchClient,
        logger: {} as Logger,
        annotationsClient: {} as ScopedAnnotationsClient,
        apmEventClient: {} as APMEventClient,
      })
    ).rejects.toThrow('BOOM');
  });

  it('returns stored annotations when derived annotations throws RequestAbortedError', async () => {
    jest
      .spyOn(GetDerivedServiceAnnotations, 'getDerivedServiceAnnotations')
      .mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            reject(
              new WrappedElasticsearchClientError(
                new errors.RequestAbortedError('foo')
              )
            );
          })
      );
    jest.spyOn(GetStoredAnnotations, 'getStoredAnnotations').mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolve(storedAnnotations);
        })
    );

    const annotations = await getServiceAnnotations({
      serviceName: 'foo',
      environment: 'bar',
      searchAggregatedTransactions: false,
      start: Date.now(),
      end: Date.now(),
      client: {} as ElasticsearchClient,
      logger: {} as Logger,
      annotationsClient: {} as ScopedAnnotationsClient,
      apmEventClient: {} as APMEventClient,
    });
    expect(annotations).toEqual({
      annotations: storedAnnotations,
    });
  });
});
