/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import { AT_TIMESTAMP, SERVICE_NAME, SPAN_ID } from '../../common/es_fields/apm';
import {
  createApmEventFieldsAccessor,
  type SearchHitWithFields,
} from './create_apm_event_fields_accessor';

const requiredFields = [SPAN_ID, SERVICE_NAME] as const;

describe('createApmEventFieldsAccessor', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  function tryAccess(hit: SearchHitWithFields<Partial<FlattenedApmEvent>>) {
    const accessor = createApmEventFieldsAccessor({ logger, operation: 'test_operation' });
    return accessor.tryAccess(hit, [...requiredFields]);
  }

  it('returns a document with single value access when all required fields are present', () => {
    const event = tryAccess({
      _id: 'doc-1',
      _index: 'logs-generic.otel-default',
      fields: {
        [SPAN_ID]: ['span-1'],
        [SERVICE_NAME]: ['my-service'],
        [AT_TIMESTAMP]: ['2023-01-01T00:00:00.000Z'],
      },
    });

    expect(event?.[SPAN_ID]).toBe('span-1');
    expect(event?.[SERVICE_NAME]).toBe('my-service');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns undefined and logs a warning when a required field is missing', () => {
    const event = tryAccess({
      _id: 'doc-1',
      _index: 'logs-generic.otel-default',
      fields: { [SERVICE_NAME]: ['my-service'] },
    });

    expect(event).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      '[test_operation] Skipping document with id [doc-1] from index [logs-generic.otel-default]: Missing required fields (span.id) in event'
    );
  });

  it('returns undefined and logs a warning when a required field is an empty array', () => {
    const event = tryAccess({
      _id: 'doc-1',
      _index: 'logs-generic.otel-default',
      fields: { [SPAN_ID]: [], [SERVICE_NAME]: ['my-service'] },
    });

    expect(event).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('span.id'));
  });

  it('returns undefined and logs a warning when the hit has no fields', () => {
    const event = tryAccess({ _id: 'doc-1', _index: 'logs-generic.otel-default' });

    expect(event).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      '[test_operation] Skipping document with id [doc-1] from index [logs-generic.otel-default]: Event has no fields'
    );
  });

  it('falls back to `unknown` in the warning when the hit has no id or index', () => {
    const event = tryAccess({ fields: {} });

    expect(event).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      '[test_operation] Skipping document with id [unknown] from index [unknown]: Missing required fields (span.id, service.name) in event'
    );
  });

  describe('warning limit', () => {
    function skipDocuments(count: number) {
      const accessor = createApmEventFieldsAccessor({ logger, operation: 'test_operation' });

      for (let i = 0; i < count; i++) {
        accessor.tryAccess({ _id: `doc-${i}`, _index: 'logs-generic.otel-default', fields: {} }, [
          ...requiredFields,
        ]);
      }
    }

    it('warns for every skipped document while under the limit', () => {
      skipDocuments(4);

      expect(logger.warn).toHaveBeenCalledTimes(4);
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('announces the limit once it is reached', () => {
      skipDocuments(5);

      expect(logger.warn).toHaveBeenCalledTimes(6);
      expect(logger.warn).toHaveBeenLastCalledWith(
        '[test_operation] Reached 5 skipped documents, further ones are logged at debug level'
      );
    });

    it('reports documents skipped beyond the limit at debug level', () => {
      skipDocuments(8);

      // 5 warned documents plus the one announcing the limit
      expect(logger.warn).toHaveBeenCalledTimes(6);
      expect(logger.debug).toHaveBeenCalledTimes(3);
      expect(logger.debug).toHaveBeenLastCalledWith(
        expect.stringContaining('Skipping document with id [doc-7]')
      );
    });

    it('keeps the count per accessor rather than per logger', () => {
      skipDocuments(8);
      (logger.warn as jest.Mock).mockClear();

      skipDocuments(1);

      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });
});
