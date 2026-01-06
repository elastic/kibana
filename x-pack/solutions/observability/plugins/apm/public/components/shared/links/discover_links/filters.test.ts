/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filterByKuery,
  filterByServiceName,
  filterByErrorGroupId,
  filterByEnvironment,
  filterByTransactionNameOrSpanName,
  filterByTransactionType,
  filterByDependencyName,
  filterBySpanId,
  filterBySampleRange,
} from './filters';
import { from } from '@kbn/esql-composer';

const INDEX = 'traces-*';

describe('APM Discover Link Filters', () => {
  describe('filterByKuery', () => {
    it('should create a KQL filter with escaped quotes', () => {
      const kuery = 'service.name:"my-service"';
      const result = from(INDEX).pipe(filterByKuery(kuery)).toString();

      expect(result.toString()).toContain('KQL("service.name:\\"my-service\\"")');
    });

    it('should trim whitespace from kuery', () => {
      const kuery = '  service.name:my-service  ';
      const result = from(INDEX).pipe(filterByKuery(kuery)).toString();

      expect(result.toString()).toContain('KQL("service.name:my-service")');
    });

    it('should replace multiple consecutive spaces with single space', () => {
      const kuery = 'service.name:my-service    AND    host.name:my-host';
      const result = from(INDEX).pipe(filterByKuery(kuery)).toString();

      expect(result.toString()).toContain('KQL("service.name:my-service AND host.name:my-host")');
    });

    it('should replace newlines with spaces', () => {
      const kuery = 'service.name:my-service\nAND\nhost.name:my-host';
      const result = from(INDEX).pipe(filterByKuery(kuery)).toString();

      expect(result.toString()).toContain('KQL("service.name:my-service AND host.name:my-host")');
    });

    it('should handle multiple newlines and spaces together', () => {
      const kuery = 'service.name:my-service\n\n  AND  \n\nhost.name:my-host';
      const result = from(INDEX).pipe(filterByKuery(kuery)).toString();

      expect(result.toString()).toContain('KQL("service.name:my-service AND host.name:my-host")');
    });

    it('should handle empty kuery after trimming', () => {
      const kuery = '   ';
      const result = from(INDEX).pipe(filterByKuery(kuery)).toString();

      expect(result.toString()).toContain('KQL("")');
    });
  });

  describe('filterByServiceName', () => {
    it('should create a service name filter', () => {
      const serviceName = 'my-service';
      const result = from(INDEX).pipe(filterByServiceName(serviceName)).toString();

      expect(result).toContain(`service.name == "${serviceName}"`);
    });

    it('should handle special characters in service name', () => {
      const serviceName = 'my-service-with-dashes_and_underscores';
      const result = from(INDEX).pipe(filterByServiceName(serviceName)).toString();

      expect(result).toContain(`service.name == "${serviceName}"`);
    });
  });

  describe('filterByErrorGroupId', () => {
    it('should create an error group ID filter', () => {
      const errorGroupId = 'error-group-123';
      const result = from(INDEX).pipe(filterByErrorGroupId(errorGroupId)).toString();

      expect(result).toContain(`error.grouping_key == "${errorGroupId}"`);
    });
  });

  describe('filterByEnvironment', () => {
    it('should create an environment filter', () => {
      const environment = 'production';
      const result = from(INDEX).pipe(filterByEnvironment(environment)).toString();

      expect(result).toContain(`service.environment == "${environment}"`);
    });
  });

  describe('filterByTransactionNameOrSpanName', () => {
    it('should create a transaction name filter when transactionName is provided', () => {
      const transactionName = 'GET /api/users';
      const result = from(INDEX)
        .pipe(filterByTransactionNameOrSpanName(transactionName, undefined))
        .toString();

      expect(result).toContain(`transaction.name == "${transactionName}"`);
    });

    it('should create a span name filter when spanName is provided and transactionName is undefined', () => {
      const spanName = 'database-query';
      const result = from(INDEX)
        .pipe(filterByTransactionNameOrSpanName(undefined, spanName))
        .toString();

      expect(result).toContain(`span.name == "${spanName}"`);
    });

    it('should prioritize transactionName when both are provided', () => {
      const transactionName = 'GET /api/users';
      const spanName = 'database-query';
      const result = from(INDEX)
        .pipe(filterByTransactionNameOrSpanName(transactionName, spanName))
        .toString();

      expect(result).toContain(`transaction.name == "${transactionName}"`);
    });
  });

  describe('filterByTransactionType', () => {
    it('should create a transaction type filter', () => {
      const transactionType = 'request';
      const result = from(INDEX).pipe(filterByTransactionType(transactionType)).toString();

      expect(result).toContain(`transaction.type == "${transactionType}"`);
    });
  });

  describe('filterByDependencyName', () => {
    it('should create a dependency name filter', () => {
      const dependencyName = 'elasticsearch';
      const result = from(INDEX).pipe(filterByDependencyName(dependencyName)).toString();

      expect(result).toContain(`span.destination.service.resource == "${dependencyName}"`);
    });
  });

  describe('filterBySpanId', () => {
    it('should create a span ID filter', () => {
      const spanId = 'span-123-456';
      const result = from(INDEX).pipe(filterBySpanId(spanId)).toString();

      expect(result).toContain(`span.id == "${spanId}"`);
    });
  });

  describe('filterBySampleRange', () => {
    it('should create a sample range filter for transactions', () => {
      const sampleRangeFrom = 1000;
      const sampleRangeTo = 5000;
      const transactionName = 'GET /api/users';
      const result = from(INDEX)
        .pipe(filterBySampleRange(sampleRangeFrom, sampleRangeTo, transactionName))
        .toString();

      expect(result).toContain(
        `transaction.duration.us >= ${sampleRangeFrom} AND transaction.duration.us <= ${sampleRangeTo}`
      );
    });

    it('should create a sample range filter for spans when transactionName is undefined', () => {
      const sampleRangeFrom = 500;
      const sampleRangeTo = 2000;
      const result = from(INDEX)
        .pipe(filterBySampleRange(sampleRangeFrom, sampleRangeTo, undefined))
        .toString();

      expect(result).toContain(
        `span.duration.us >= ${sampleRangeFrom} AND span.duration.us <= ${sampleRangeTo}`
      );
    });

    it('should handle zero values for sample range', () => {
      const sampleRangeFrom = 0;
      const sampleRangeTo = 1000;
      const result = from(INDEX)
        .pipe(filterBySampleRange(sampleRangeFrom, sampleRangeTo, undefined))
        .toString();

      expect(result).toContain(
        `span.duration.us >= ${sampleRangeFrom} AND span.duration.us <= ${sampleRangeTo}`
      );
    });
  });
});
