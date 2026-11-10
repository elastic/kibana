/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker, isStringLiteral } from '@elastic/esql';
import { getESQLQuery, getESQLQueryFromIndexPattern, getApmIndexPattern } from './get_esql_query';
import {
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  EVENT_NAME,
  OTEL_EVENT_NAME,
  PROCESSOR_EVENT,
} from '@kbn/apm-types';
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
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

    it('should add traceId filter', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { traceId: 'trace-789' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${TRACE_ID}\` == "trace-789"`);
    });

    it('should not add traceId filter when traceId is not provided', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {},
        indexSettings: createMockIndexSettings(),
      });

      expect(result).not.toContain(TRACE_ID);
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

    it('should add a NOT exists KQL predicate for ENVIRONMENT_NOT_DEFINED_VALUE', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { environment: ENVIRONMENT_NOT_DEFINED_VALUE },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`NOT ${SERVICE_ENVIRONMENT} : *`);
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

    // Inline on purpose: `getKqlSearchQueries` in @kbn/esql-utils does the same, but it trims the
    // values (which would hide whitespace changes), drops parse errors, and would add a package
    // dependency to the APM plugin just for this test.
    const getKqlLiterals = (query: string) => {
      const { root, errors } = Parser.parse(query);
      const literals: string[] = [];
      Walker.walk(root, {
        visitFunction: (fn) => {
          const [arg] = fn.args;
          if (fn.name.toLowerCase() === 'kql' && isStringLiteral(arg)) {
            literals.push(arg.valueUnquoted);
          }
        },
      });
      return { errors, literals };
    };

    /**
     * The kuery comes from the user's query bar and is embedded in an ES|QL string literal.
     * The printed query must parse cleanly AND the literal must decode back to exactly the
     * kuery the user typed, so no character is lost or reinterpreted along the way.
     */
    it.each([
      [
        'nested/unbalanced double quotes',
        'url.query: "filter=+type:"INDIVIDUAL"+AND+NOT+status:"NNA""',
      ],
      ['wildcard inside a quoted phrase', 'status.message : "Last loaded AES TIK for*"'],
      ['plain quoted value', 'error.exception.type:"AppExceptionsServiceException"'],
      ['escaped colon', 'labels.in\\:correlationid :"abc"'],
      ['wildcards and escaped colons', '* \\:* \\:"* "'],
      ['escaped quote inside a phrase', 'message: "say \\"hi\\""'],
      ['trailing backslash', 'path: C\\\\'],
      ['lone double quote', '"'],
      ['lone backslash', '\\'],
      ['ES|QL placeholder characters', 'a: ?param and b: ??ident'],
      ['backticks and dollar signs', 'a: `b` and c: $d'],
      ['comment markers inside a phrase', 'a: "/* x */" or b: "// y"'],
      ['a pipe followed by another command', 'a: 1 | LIMIT 1'],
      ['tab and newline', 'a: x\tand\nb: y'],
      ['leading and trailing whitespace', '  a: 1  '],
      ['non-ASCII characters', 'name: "żółć ü é 日本"'],
      ['KQL ranges and boolean operators', 'a > 5 and not (b < 3 or c: *)'],
    ])('keeps a kuery with %s intact as a single KQL string literal', (_, kuery) => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { kuery },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).not.toBeNull();
      const { errors, literals } = getKqlLiterals(result!);
      expect(errors).toHaveLength(0);
      expect(literals).toEqual([kuery]);
    });

    it('emits one KQL command per kuery source, in order, each parseable', () => {
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: {
          environment: ENVIRONMENT_NOT_DEFINED_VALUE,
          exceptionsOnly: true,
          kuery: 'url.query: "a"b""',
        },
      });

      const { errors, literals } = getKqlLiterals(result);
      expect(errors).toHaveLength(0);
      expect(literals).toHaveLength(3);
      expect(literals[0]).toContain(SERVICE_ENVIRONMENT);
      expect(literals[1]).toContain(OTEL_EVENT_NAME);
      expect(literals[2]).toBe('url.query: "a"b""');
    });

    it('does not add a KQL command for an empty kuery', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { kuery: '' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).not.toContain('KQL(');
    });

    it('does not let a kuery break out of the string literal to inject another command', () => {
      const kuery = '") | DROP service.name | WHERE KQL("';
      const result = getESQLQuery({
        indexType: 'traces',
        params: { kuery },
        indexSettings: createMockIndexSettings(),
      });

      // The payload must stay inside the escaped literal: one FROM and one WHERE, nothing else.
      const { root } = Parser.parse(result!);
      expect(root.commands.map((command) => command.name)).toEqual(['from', 'where']);
      expect(getKqlLiterals(result!).literals).toEqual([kuery]);
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

    it('should combine traceId with other filters correctly', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {
          serviceName: 'my-service',
          traceId: 'abc-123-def',
          transactionName: 'GET /api/users',
        },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
      expect(result).toContain(`\`${TRACE_ID}\` == "abc-123-def"`);
      expect(result).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
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

  describe('sort direction', () => {
    it('should add SORT @timestamp ASC when sortDirection is ASC', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { traceId: 'trace-789', sortDirection: 'ASC' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${TRACE_ID}\` == "trace-789"`);
      expect(result).toContain('SORT @timestamp ASC');
    });

    it('should add SORT @timestamp DESC when sortDirection is DESC', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { sortDirection: 'DESC' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain('SORT @timestamp DESC');
    });

    it('should not add SORT when sortDirection is not provided', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: { traceId: 'trace-789' },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).not.toContain('SORT');
    });

    it('should place SORT after all WHERE clauses and KQL', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {
          serviceName: 'my-service',
          kuery: 'status: 200',
          sortDirection: 'ASC',
        },
        indexSettings: createMockIndexSettings(),
      });

      const sortIndex = result!.indexOf('SORT');
      const kqlIndex = result!.indexOf('KQL');
      expect(sortIndex).toBeGreaterThan(kqlIndex);
    });

    it('should add SORT @timestamp DESC with service and transaction filters', () => {
      const result = getESQLQuery({
        indexType: 'traces',
        params: {
          serviceName: 'my-service',
          environment: 'production',
          transactionName: 'GET /api/users',
          transactionType: 'request',
          sortDirection: 'DESC',
        },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
      expect(result).toContain(`\`${SERVICE_ENVIRONMENT}\` == "production"`);
      expect(result).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
      expect(result).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
      expect(result).toContain('SORT @timestamp DESC');
    });

    it('should add SORT @timestamp DESC for error index queries', () => {
      const result = getESQLQuery({
        indexType: 'error',
        params: {
          serviceName: 'my-service',
          errorGroupId: 'error-123',
          sortDirection: 'DESC',
        },
        indexSettings: createMockIndexSettings(),
      });

      expect(result).toContain(`\`${ERROR_GROUP_ID}\` == "error-123"`);
      expect(result).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
      expect(result).toContain('SORT @timestamp DESC');
    });
  });
});

describe('getApmIndexPattern', () => {
  it('returns null for empty indexSettings', () => {
    expect(getApmIndexPattern({ indexType: 'traces', indexSettings: [] })).toBeNull();
  });

  it('resolves the correct indices for traces', () => {
    const result = getApmIndexPattern({
      indexType: 'traces',
      indexSettings: createMockIndexSettings(),
    });
    expect(result).toBe(MOCK_TRACES_INDEX);
  });

  it('resolves the error index', () => {
    const result = getApmIndexPattern({
      indexType: 'error',
      indexSettings: createMockIndexSettings(),
    });
    expect(result).toBe(MOCK_ERROR_INDEX);
  });
});

describe('getESQLQueryFromIndexPattern', () => {
  describe('logs index pattern and exception filters', () => {
    /**
     * These tests are regression guards for the EVENT_NAME vs OTEL_EVENT_NAME bug class.
     * event.name (EVENT_NAME) is for OTel-native data streams; event_name (OTEL_EVENT_NAME)
     * is the flattened field used in generic log streams and by the server-side
     * getUnprocessedOtelErrors query. Using the wrong one produces no results.
     */
    it('filters on the flattened event_name field (OTEL_EVENT_NAME), never event.name (EVENT_NAME)', () => {
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: { traceId: 't1', spanId: 's1', exceptionsOnly: true },
      });

      // The flattened field must be present.
      expect(result).toContain(OTEL_EVENT_NAME); // 'event_name'
      // The wrong field must never appear — 'event.name' is NOT a substring of 'event_name',
      // so this is a clean discriminator.
      expect(result).not.toContain(EVENT_NAME); // 'event.name'
    });

    it('ORs the event_name, exception.type and exception.message discriminators (not ANDs them)', () => {
      // A doc with exception.type but no event_name must still match. If they were ANDed,
      // such docs would be silently excluded.
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: { exceptionsOnly: true },
      });

      // All three discriminators must be present — they mirror the `should` clauses of the
      // server-side getUnprocessedOtelErrors query. A narrower predicate here means rows the
      // endpoint returns have a Discover link that resolves to nothing.
      expect(result).toContain(OTEL_EVENT_NAME); // 'event_name'
      expect(result).toContain(EXCEPTION_TYPE); // 'exception.type'
      expect(result).toContain(`${EXCEPTION_MESSAGE} : *`); // 'exception.message : *'

      // They must be connected by OR, not AND.
      // Find the KQL clause. The esql composer may format as KQL("...") on one line or
      // KQL(\n  "...") across multiple lines — search for 'KQL(' and check what follows.
      const kqlStart = result.indexOf('KQL(');
      expect(kqlStart).toBeGreaterThan(-1);
      // Slice everything after 'KQL(' — the OR must appear somewhere inside the expression.
      const kqlContent = result.slice(kqlStart + 4);
      expect(kqlContent.toLowerCase()).toMatch(/ or /);
    });

    it('excludes documents that were already processed into APM errors', () => {
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: { exceptionsOnly: true },
      });

      // processor.event must appear in a "not ... : *" clause inside the KQL string.
      expect(result).toContain(PROCESSOR_EVENT);
      expect(result).toContain(`not ${PROCESSOR_EVENT} : *`);
    });

    it('narrows to a single document by _id when documentId is set', () => {
      // exception.message and exception.type are both optional on these documents, so `_id` is
      // the only field that reliably identifies one row.
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: {
          traceId: 't1',
          spanId: 's1',
          exceptionsOnly: true,
          documentId: 'doc-abc',
        },
      });

      // `_id` is only addressable when requested as a METADATA field on FROM.
      expect(result).toContain('METADATA _id');
      expect(result).toContain('_id == "doc-abc"');
    });

    it('does not request the _id metadata field when documentId is absent', () => {
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: { traceId: 't1', spanId: 's1', exceptionsOnly: true },
      });

      expect(result).not.toContain('METADATA');
    });

    it('does not include the exception clause when exceptionsOnly is false or absent', () => {
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: { traceId: 't1' },
      });

      expect(result).not.toContain(OTEL_EVENT_NAME);
      expect(result).not.toContain(EVENT_NAME);
    });

    it('handles a comma-separated log-sources pattern as FROM', () => {
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-synth-default,logs-generic.otel-default',
        params: {},
      });

      expect(result).toContain('FROM logs-synth-default');
      expect(result).toContain('logs-generic.otel-default');
    });

    it('places SORT after the exception KQL clause', () => {
      const result = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: { exceptionsOnly: true, sortDirection: 'DESC' },
      });

      const sortIndex = result.indexOf('SORT');
      const kqlIndex = result.indexOf('KQL');
      expect(sortIndex).toBeGreaterThan(kqlIndex);
    });

    it('two rows with different documentId produce two distinct queries', () => {
      // This guards against a regression where all rows share the same non-narrowed query —
      // including rows that carry no exception.message at all.
      const result1 = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: { traceId: 't1', spanId: 's1', exceptionsOnly: true, documentId: 'doc-a' },
      });
      const result2 = getESQLQueryFromIndexPattern({
        indexPattern: 'logs-*',
        params: { traceId: 't1', spanId: 's1', exceptionsOnly: true, documentId: 'doc-b' },
      });

      expect(result1).not.toBe(result2);
      expect(result1).toContain('doc-a');
      expect(result2).toContain('doc-b');
    });
  });
});
