/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeviceOSApp } from './get_device_os_app';
import { getNCT } from './get_nct';
import type { SearchParamsMock } from '../../utils/test_helpers';
import { inspectSearchParams } from '../../utils/test_helpers';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { ApmDocumentType } from '../../../common/document_type';

const baseParams = {
  serviceName: 'serviceName',
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
  start: 0,
  end: 50000,
  size: 10,
  transactionType: 'mobile',
};

describe('mobile filters queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  describe('getDeviceOSApp', () => {
    it('queries transaction events when no error type is given', async () => {
      mock = await inspectSearchParams(({ mockApmEventClient }) =>
        getDeviceOSApp({ ...baseParams, apmEventClient: mockApmEventClient })
      );

      expect(mock.params.apm.sources[0].documentType).toBe(ApmDocumentType.TransactionEvent);
      expect(mock.params.query.bool.filter).toContainEqual({
        term: { 'transaction.type': 'mobile' },
      });
      expect(mock.params).toMatchSnapshot();
    });

    it('queries crash error events when error type is crash', async () => {
      mock = await inspectSearchParams(({ mockApmEventClient }) =>
        getDeviceOSApp({
          ...baseParams,
          errorType: 'crash',
          apmEventClient: mockApmEventClient,
        })
      );

      expect(mock.params.apm.sources[0].documentType).toBe(ApmDocumentType.ErrorEvent);
      expect(mock.params.query.bool.filter).toContainEqual({ term: { 'error.type': 'crash' } });
      expect(mock.params.query.bool.filter).not.toContainEqual({
        term: { 'transaction.type': 'mobile' },
      });
      expect(mock.params).toMatchSnapshot();
    });
  });

  describe('getNCT', () => {
    it('queries span events when no error type is given', async () => {
      mock = await inspectSearchParams(({ mockApmEventClient }) =>
        getNCT({ ...baseParams, apmEventClient: mockApmEventClient })
      );

      expect(mock.params.apm.sources[0].documentType).toBe(ApmDocumentType.SpanEvent);
      expect(mock.params).toMatchSnapshot();
    });

    it('queries crash error events when error type is crash', async () => {
      mock = await inspectSearchParams(({ mockApmEventClient }) =>
        getNCT({ ...baseParams, errorType: 'crash', apmEventClient: mockApmEventClient })
      );

      expect(mock.params.apm.sources[0].documentType).toBe(ApmDocumentType.ErrorEvent);
      expect(mock.params.query.bool.filter).toContainEqual({ term: { 'error.type': 'crash' } });
      expect(mock.params).toMatchSnapshot();
    });
  });
});
