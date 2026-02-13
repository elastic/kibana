/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQuery } from './get_esql_query';
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
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';

const MOCK_TRACES_INDEX = 'traces-apm-*';
const MOCK_ERROR_INDEX = 'logs-apm.error-*';

const createMockIndexSettings = (
  overrides: Partial<{
    transaction: string;
    span: string;
    error: string;
  }> = {}
): ApmIndexSettingsResponse['apmIndexSettings'] => [
  {
    configurationName: 'transaction',
    defaultValue: 'traces-apm-default-*',
    savedValue: overrides.transaction ?? MOCK_TRACES_INDEX,
  },
  {
    configurationName: 'span',
    defaultValue: 'traces-apm-default-*',
    savedValue: overrides.span ?? MOCK_TRACES_INDEX,
  },
  {
    configurationName: 'error',
    defaultValue: 'logs-apm.error-default-*',
    savedValue: overrides.error ?? MOCK_ERROR_INDEX,
  },
];

describe('getESQLQuery', () => {
  describe('index handling', () => {
    it('should return null when indexSettings is empty', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {},
        indexSettings: [],
      });

      expect(result).toBeNull();
    });

    it('should return null when indexSettings is undefined', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {},
        indexSettings: undefined as any,
      });

      expect(result).toBeNull();
    });

    it('should use span and transaction indices for traces indexType', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {},
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`FROM ${MOCK_TRACES_INDEX}`);
      expect(result).not.toContain(MOCK_ERROR_INDEX);
    });

    it('should use error indices for error indexType', () => {
      const result = getESQLQuery({
        indexType: 'error',
        params: {},
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`FROM ${MOCK_ERROR_INDEX}`);
      expect(result).not.toContain(MOCK_TRACES_INDEX);
    });

    it('should deduplicate indices when span and transaction have the same value', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {},
        indexSettings: [
          {
            configurationName: 'transaction',
            savedValue: 'shared-index-*',
            defaultValue: 'default-*',
          },
          { configurationName: 'span', savedValue: 'shared-index-*', defaultValue: 'default-*' },
        ],
      });

      expect(result).toBe('FROM shared-index-*');
    });

    it('should use defaultValue when savedValue is not set', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {},
        indexSettings: [
          {
            configurationName: 'transaction',
            defaultValue: 'default-traces-*',
            savedValue: undefined,
          },
          {
            configurationName: 'span',
            defaultValue: 'default-traces-*',
            savedValue: undefined,
          },
        ],
      });

      expect(result).toContain('FROM default-traces-*');
    });
  });

  describe('service filters', () => {
    it('should add serviceName filter', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { serviceName: 'my-service' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
    });

    it('should add errorGroupId filter', () => {
      const result = getESQLQuery({
        indexType: 'error',
        params: { errorGroupId: 'error-123' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${ERROR_GROUP_ID}\` == "error-123"`);
    });

    it('should add spanId filter', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { spanId: 'span-456' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SPAN_ID}\` == "span-456"`);
    });
  });

  describe('environment filter', () => {
    it('should add environment filter for valid environment', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { environment: 'production' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SERVICE_ENVIRONMENT}\` == "production"`);
    });

    it('should skip environment filter for ENVIRONMENT_ALL_VALUE', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { environment: ENVIRONMENT_ALL_VALUE },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).not.toContain(SERVICE_ENVIRONMENT);
    });

    it('should skip environment filter for ENVIRONMENT_NOT_DEFINED_VALUE', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { environment: ENVIRONMENT_NOT_DEFINED_VALUE },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).not.toContain(SERVICE_ENVIRONMENT);
    });
  });

  describe('transaction and span name filters', () => {
    it('should add transactionName filter', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { transactionName: 'GET /api/users' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
    });

    it('should add spanName filter when transactionName is not provided', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { spanName: 'database-query' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SPAN_NAME}\` == "database-query"`);
    });

    it('should prioritize transactionName over spanName', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { transactionName: 'GET /api/users', spanName: 'database-query' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
      expect(result).not.toContain(SPAN_NAME);
    });

    it('should add transactionType filter', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { transactionType: 'request' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
    });
  });

  describe('dependency filter', () => {
    it('should add dependencyName filter', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { dependencyName: 'elasticsearch' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SPAN_DESTINATION_SERVICE_RESOURCE}\` == "elasticsearch"`);
    });
  });

  describe('sample range filter', () => {
    it('should add sample range filter using transaction duration when transactionName is provided', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {
          transactionName: 'GET /api/users',
          sampleRangeFrom: 1000,
          sampleRangeTo: 5000,
        },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${TRANSACTION_DURATION}\` >= 1000`);
      expect(result).toContain(`\`${TRANSACTION_DURATION}\` <= 5000`);
    });

    it('should add sample range filter using span duration when transactionName is not provided', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {
          sampleRangeFrom: 500,
          sampleRangeTo: 2000,
        },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SPAN_DURATION}\` >= 500`);
      expect(result).toContain(`\`${SPAN_DURATION}\` <= 2000`);
    });

    it('should not add sample range filter when only sampleRangeFrom is provided', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { sampleRangeFrom: 1000 },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).not.toContain(TRANSACTION_DURATION);
      expect(result).not.toContain(SPAN_DURATION);
    });

    it('should not add sample range filter when only sampleRangeTo is provided', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { sampleRangeTo: 5000 },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).not.toContain(TRANSACTION_DURATION);
      expect(result).not.toContain(SPAN_DURATION);
    });
  });

  describe('kuery filter', () => {
    it('should add kuery filter with KQL function', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { kuery: 'user.id: "123"' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain('WHERE KQL("user.id: \\"123\\"")');
    });
  });

  describe('combined filters', () => {
    it('should combine multiple filters correctly', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {
          serviceName: 'my-service',
          environment: 'production',
          transactionName: 'GET /api/users',
          transactionType: 'request',
          sampleRangeFrom: 1000,
          sampleRangeTo: 5000,
          kuery: 'status: 200',
        },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
      expect(result).toContain(`\`${SERVICE_ENVIRONMENT}\` == "production"`);
      expect(result).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
      expect(result).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
      expect(result).toContain(`\`${TRANSACTION_DURATION}\` >= 1000`);
      expect(result).toContain(`\`${TRANSACTION_DURATION}\` <= 5000`);
      expect(result).toContain('KQL("status: 200")');
    });

    it('should return only FROM clause when no params are provided', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {},
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toBe(`FROM ${MOCK_TRACES_INDEX}`);
    });
  });
});
