/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getDeviceOSApp } from './get_device_os_app';
import { ApmDocumentType } from '../../../common/document_type';
import { ERROR_TYPE } from '../../../common/es_fields/apm';

describe('getDeviceOSApp', () => {
  const commonParams = {
    environment: 'prod',
    serviceName: 'myServiceName',
    kuery: '',
    start: 1528113600000,
    end: 1528977600000,
    size: 10,
  };

  const buildClientSpy = () =>
    jest.fn().mockResolvedValueOnce({
      aggregations: {
        devices: { buckets: [] },
        osVersions: { buckets: [] },
        appVersions: { buckets: [] },
      },
    });

  it('queries transaction documents when no errorType is provided', async () => {
    const clientSpy = buildClientSpy();
    await getDeviceOSApp({ ...commonParams, apmEventClient: { search: clientSpy } as any });

    const query = clientSpy.mock.calls[0][1];
    expect(query.apm.sources[0].documentType).toEqual(ApmDocumentType.TransactionEvent);
    expect(query.apm.events).toBeUndefined();
  });

  it('queries only crash documents when errorType is crash', async () => {
    const clientSpy = buildClientSpy();
    await getDeviceOSApp({
      ...commonParams,
      errorType: 'crash',
      apmEventClient: { search: clientSpy } as any,
    });

    const query = clientSpy.mock.calls[0][1];
    expect(query.apm.events).toEqual([ProcessorEvent.error]);
    expect(query.query.bool.filter).toEqual(
      expect.arrayContaining([{ term: { [ERROR_TYPE]: 'crash' } }])
    );
  });

  it('excludes crash documents when errorType is error', async () => {
    const clientSpy = buildClientSpy();
    await getDeviceOSApp({
      ...commonParams,
      errorType: 'error',
      apmEventClient: { search: clientSpy } as any,
    });

    const query = clientSpy.mock.calls[0][1];
    expect(query.apm.events).toEqual([ProcessorEvent.error]);
    expect(query.query.bool.filter).toEqual(
      expect.arrayContaining([{ bool: { must_not: [{ term: { [ERROR_TYPE]: 'crash' } }] } }])
    );
  });
});
