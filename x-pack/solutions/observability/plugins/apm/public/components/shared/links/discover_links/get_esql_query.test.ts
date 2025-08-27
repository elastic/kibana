/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { getEsQlQuery } from './get_esql_query';
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';

const mockApmIndexSettings = [
  {
    configurationName: 'transaction',
    defaultValue: 'traces-apm*',
    savedValue: 'custom-traces-*',
  },
  {
    configurationName: 'span',
    defaultValue: 'traces-apm*',
    savedValue: null,
  },
  {
    configurationName: 'error',
    defaultValue: 'apm-*',
    savedValue: 'custom-errors-*',
  },
  {
    configurationName: 'metric',
    defaultValue: 'metrics-apm*',
    savedValue: null,
  },
] as ApmIndexSettingsResponse['apmIndexSettings'];

describe('getEsQlQuery', () => {
  describe('error mode', () => {
    it('should generate query with errorGroupId only', () => {
      const result = getEsQlQuery({
        mode: 'error',
        params: {
          errorGroupId: 'error-123',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*, custom-errors-*\n  | WHERE ${ERROR_GROUP_ID} == "error-123"`
      );
    });

    it('should generate query with serviceName and errorGroupId', () => {
      const result = getEsQlQuery({
        mode: 'error',
        params: {
          errorGroupId: 'error-123',
          serviceName: 'my-service',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*, custom-errors-*\n  | WHERE ${ERROR_GROUP_ID} == "error-123"\n  | WHERE ${SERVICE_NAME} == "my-service"`
      );
    });

    it('should generate query with kuery filter', () => {
      const result = getEsQlQuery({
        mode: 'error',
        params: {
          errorGroupId: 'error-123',
          kuery: 'error.message: "timeout"',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*, custom-errors-*\n  | WHERE ${ERROR_GROUP_ID} == "error-123"\n  | WHERE KQL("error.message: \\"timeout\\"")`
      );
    });

    it('should generate comprehensive query with all error parameters', () => {
      const result = getEsQlQuery({
        mode: 'error',
        params: {
          errorGroupId: 'error-123',
          serviceName: 'my-service',
          kuery: 'status_code: 500',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*, custom-errors-*\n  | WHERE ${ERROR_GROUP_ID} == "error-123"\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE KQL("status_code: 500")`
      );
    });

    it('should skip errorGroupId when not provided', () => {
      const result = getEsQlQuery({
        mode: 'error',
        params: {
          serviceName: 'my-service',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*, custom-errors-*\n  | WHERE ${SERVICE_NAME} == "my-service"`
      );
    });
  });

  describe('span mode', () => {
    it('should generate query with spanId only', () => {
      const result = getEsQlQuery({
        mode: 'span',
        params: {
          spanId: 'span-456',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(`FROM custom-traces-*, traces-apm*\n  | WHERE ${SPAN_ID} == "span-456"`);
    });

    it('should generate query with spanId and kuery', () => {
      const result = getEsQlQuery({
        mode: 'span',
        params: {
          spanId: 'span-456',
          kuery: 'span.type: "db"',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SPAN_ID} == "span-456"\n  | WHERE KQL("span.type: \\"db\\"")`
      );
    });

    it('should skip spanId when not provided', () => {
      const result = getEsQlQuery({
        mode: 'span',
        params: {
          kuery: 'span.duration.us > 1000',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE KQL("span.duration.us > 1000")`
      );
    });

    it('should generate basic query when no parameters provided', () => {
      const result = getEsQlQuery({
        mode: 'span',
        params: {},
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe('FROM custom-traces-*, traces-apm*');
    });
  });

  describe('waterfall mode', () => {
    it('should generate query with serviceName only', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"`
      );
    });

    it('should generate query with transaction filters', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          transactionName: 'GET /api/test',
          transactionType: 'request',
          environment: 'production',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE ${SERVICE_ENVIRONMENT} == "production"\n  | WHERE ${TRANSACTION_NAME} == "GET /api/test"\n  | WHERE ${TRANSACTION_TYPE} == "request"`
      );
    });

    it('should generate query with span filters', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          spanName: 'elasticsearch-query',
          dependencyName: 'elasticsearch',
          environment: 'staging',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE ${SERVICE_ENVIRONMENT} == "staging"\n  | WHERE ${SPAN_NAME} == "elasticsearch-query"\n  | WHERE ${SPAN_DESTINATION_SERVICE_RESOURCE} == "elasticsearch"`
      );
    });

    it('should generate query with transaction duration filters', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          transactionName: 'POST /api/data',
          sampleRangeFrom: 1000,
          sampleRangeTo: 5000,
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE ${TRANSACTION_NAME} == "POST /api/data"\n  | WHERE ${TRANSACTION_DURATION} >= 1000 AND ${TRANSACTION_DURATION} <= 5000`
      );
    });

    it('should generate query with span duration filters', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          spanName: 'db-query',
          sampleRangeFrom: 500,
          sampleRangeTo: 2000,
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE ${SPAN_NAME} == "db-query"\n  | WHERE ${SPAN_DURATION} >= 500 AND ${SPAN_DURATION} <= 2000`
      );
    });

    it('should skip environment filter for ENVIRONMENT_ALL_VALUE', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          environment: 'ENVIRONMENT_ALL',
          transactionName: 'test-transaction',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE ${TRANSACTION_NAME} == "test-transaction"`
      );
    });

    it('should skip environment filter for ENVIRONMENT_NOT_DEFINED_VALUE', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          environment: 'ENVIRONMENT_NOT_DEFINED',
          transactionName: 'test-transaction',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE ${TRANSACTION_NAME} == "test-transaction"`
      );
    });

    it('should generate query with kuery filter', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          kuery: 'user.id: "123" AND status_code: 200',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE KQL("user.id: \\"123\\" AND status_code: 200")`
      );
    });

    it('should skip duration filters when only one range is provided', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          transactionName: 'test-transaction',
          sampleRangeFrom: 1000,
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE ${TRANSACTION_NAME} == "test-transaction"`
      );
    });

    it('should generate comprehensive query with all waterfall parameters', () => {
      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
          transactionName: 'GET /api/comprehensive',
          transactionType: 'request',
          dependencyName: 'postgres',
          environment: 'production',
          sampleRangeFrom: 1000,
          sampleRangeTo: 10000,
          kuery: 'error.message: "timeout"',
        },
        apmIndexSettings: mockApmIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, traces-apm*\n  | WHERE ${SERVICE_NAME} == "my-service"\n  | WHERE ${SERVICE_ENVIRONMENT} == "production"\n  | WHERE ${TRANSACTION_NAME} == "GET /api/comprehensive"\n  | WHERE ${TRANSACTION_TYPE} == "request"\n  | WHERE ${SPAN_DESTINATION_SERVICE_RESOURCE} == "postgres"\n  | WHERE ${TRANSACTION_DURATION} >= 1000 AND ${TRANSACTION_DURATION} <= 10000\n  | WHERE KQL("error.message: \\"timeout\\"")`
      );
    });
  });

  describe('index deduplication', () => {
    it('should deduplicate indices when they have the same values', () => {
      const duplicatedIndexSettings = [
        {
          configurationName: 'transaction',
          defaultValue: 'traces-*',
        },
        {
          configurationName: 'span',
          defaultValue: 'traces-*',
        },
      ] as ApmIndexSettingsResponse['apmIndexSettings'];

      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
        },
        apmIndexSettings: duplicatedIndexSettings,
      });

      expect(result).toBe(`FROM traces-*\n  | WHERE ${SERVICE_NAME} == "my-service"`);
    });

    it('should use savedValue over defaultValue when available', () => {
      const mixedIndexSettings = [
        {
          configurationName: 'transaction',
          defaultValue: 'default-traces-*',
          savedValue: 'custom-traces-*',
        },
        {
          configurationName: 'span',
          defaultValue: 'default-traces-*',
          savedValue: null,
        },
      ] as ApmIndexSettingsResponse['apmIndexSettings'];

      const result = getEsQlQuery({
        mode: 'waterfall',
        params: {
          serviceName: 'my-service',
        },
        apmIndexSettings: mixedIndexSettings,
      });

      expect(result).toBe(
        `FROM custom-traces-*, default-traces-*\n  | WHERE ${SERVICE_NAME} == "my-service"`
      );
    });
  });
});
