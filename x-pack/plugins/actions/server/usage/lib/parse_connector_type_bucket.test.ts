/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseDurationsByConnectorTypesBucket,
  parseActionRunOutcomeByConnectorTypesBucket,
} from './parse_connector_type_bucket';

describe('parseDurationsByConnectorTypesBucket', () => {
  test('should correctly parse connector type bucket results', () => {
    expect(
      parseDurationsByConnectorTypesBucket([
        {
          key: '.server-log',
          doc_count: 78,
          duration: { average: { value: 10.2 } },
        },
        {
          key: '.index',
          doc_count: 42,
          duration: { average: { value: 11.6 } },
        },
        {
          key: '.slack',
          doc_count: 28,
          duration: { average: { value: 12.4 } },
        },
      ])
    ).toEqual({
      '__server-log': 10,
      __index: 12,
      __slack: 12,
    });
  });

  test('should handle missing values', () => {
    expect(
      parseDurationsByConnectorTypesBucket([
        // @ts-expect-error
        {
          key: '.server-log',
          doc_count: 78,
        },
        {
          key: '.index',
          doc_count: 42,
          // @ts-expect-error
          duration: {},
        },
        {
          key: '.slack',
          doc_count: 28,
          // @ts-expect-error
          duration: { average: {} },
        },
      ])
    ).toEqual({
      '__server-log': 0,
      __index: 0,
      __slack: 0,
    });
  });

  test('should handle empty input', () => {
    expect(parseDurationsByConnectorTypesBucket([])).toEqual({});
  });
  //
  test('should handle undefined input', () => {
    expect(parseDurationsByConnectorTypesBucket(undefined)).toEqual({});
  });
});

describe('parseActionRunOutcomeByConnectorTypesBucket', () => {
  test('should correctly parse connector type bucket results', () => {
    expect(
      parseActionRunOutcomeByConnectorTypesBucket([
        {
          key: '.server-log',
          doc_count: 78,
          outcome: {
            count: {
              buckets: [
                { key: 'success', doc_count: 2 },
                { key: 'failure', doc_count: 1 },
              ],
            },
          },
        },
        {
          key: '.index',
          doc_count: 42,
          outcome: {
            count: {
              buckets: [
                { key: 'success', doc_count: 3 },
                { key: 'failure', doc_count: 4 },
              ],
            },
          },
        },
      ])
    ).toEqual({
      __index: {
        failure: 4,
        success: 3,
      },
      '__server-log': {
        failure: 1,
        success: 2,
      },
    });
  });

  test('should handle missing values', () => {
    expect(
      parseActionRunOutcomeByConnectorTypesBucket([
        {
          key: '.server-log',
          doc_count: 78,
          outcome: {
            count: {
              // @ts-expect-error
              buckets: [{ key: 'success', doc_count: 2 }, { key: 'failure' }],
            },
          },
        },
        {
          key: '.index',
          outcome: {
            // @ts-expect-error
            count: {},
          },
        },
      ])
    ).toEqual({
      '__server-log': {
        failure: 0,
        success: 2,
      },
      __index: {},
    });
  });

  test('should handle empty input', () => {
    expect(parseActionRunOutcomeByConnectorTypesBucket([])).toEqual({});
  });
  //
  test('should handle undefined input', () => {
    expect(parseActionRunOutcomeByConnectorTypesBucket(undefined)).toEqual({});
  });
});
