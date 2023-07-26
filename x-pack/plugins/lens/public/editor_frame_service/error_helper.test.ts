/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOriginalRequestErrorMessages } from './error_helper';
import type { CoreStart } from '@kbn/core/public';

const docLinksMock = { links: { fleet: { datastreamsTSDSMetrics: '' } } } as CoreStart['docLinks'];

const runtimeFieldError = {
  stack: 'Error: EsError\n...',
  message: '[lens_merge_tables] > [esaggs] > EsError',
  name: 'Error',
  original: {
    name: 'Error',
    message: 'Something',
    err: {
      message: 'status_exception',
      statusCode: 400,
      attributes: {
        type: 'status_exception',
        reason: 'error while executing search',
        caused_by: {
          type: 'search_phase_execution_exception',
          reason: 'all shards failed',
          phase: 'query',
          grouped: true,
          failed_shards: [
            {
              shard: 0,
              index: 'indexpattern_source',
              node: 'jtqB1-UhQluyjeXIpQFqAA',
              reason: {
                type: 'script_exception',
                reason: 'runtime error',
                script_stack: [
                  'java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:68)',
                  'java.base/java.lang.Integer.parseInt(Integer.java:652)',
                  'java.base/java.lang.Integer.parseInt(Integer.java:770)',
                  "emit(Integer.parseInt('hello'))",
                  '            ^---- HERE',
                ],
                script: "emit(Integer.parseInt('hello'))",
                lang: 'painless',
                position: { offset: 12, start: 0, end: 31 },
                caused_by: { type: 'number_format_exception', reason: 'For input string: "hello"' },
              },
            },
          ],
        },
      },
    },
    attributes: {
      type: 'status_exception',
      reason: 'error while executing search',
      caused_by: {
        type: 'search_phase_execution_exception',
        reason: 'all shards failed',
        phase: 'query',
        grouped: true,
        failed_shards: [
          {
            shard: 0,
            index: 'indexpattern_source',
            node: 'jtqB1-UhQluyjeXIpQFqAA',
            reason: {
              type: 'script_exception',
              reason: 'runtime error',
              script_stack: [
                'java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:68)',
                'java.base/java.lang.Integer.parseInt(Integer.java:652)',
                'java.base/java.lang.Integer.parseInt(Integer.java:770)',
                "emit(Integer.parseInt('hello'))",
                '            ^---- HERE',
              ],
              script: "emit(Integer.parseInt('hello'))",
              lang: 'painless',
              position: { offset: 12, start: 0, end: 31 },
              caused_by: { type: 'number_format_exception', reason: 'For input string: "hello"' },
            },
          },
        ],
      },
    },
  },
};

const scriptedFieldError = {
  stack: 'Error: EsError\n...',
  message: '[lens_merge_tables] > [esaggs] > EsError',
  name: 'Error',
  original: {
    name: 'Error',
    message: 'Some description',
    err: {
      message: 'status_exception',
      statusCode: 500,
      attributes: {
        type: 'status_exception',
        reason: 'error while executing search',
        caused_by: {
          type: 'search_phase_execution_exception',
          reason: 'all shards failed',
          phase: 'query',
          grouped: true,
          failed_shards: [
            {
              shard: 0,
              index: 'indexpattern_source',
              node: 'jtqB1-UhQluyjeXIpQFqAA',
              reason: {
                type: 'aggregation_execution_exception',
                reason: 'Unsupported script value [hello], expected a number, date, or boolean',
              },
            },
          ],
        },
      },
    },
    attributes: {
      type: 'status_exception',
      reason: 'error while executing search',
      caused_by: {
        type: 'search_phase_execution_exception',
        reason: 'all shards failed',
        phase: 'query',
        grouped: true,
        failed_shards: [
          {
            shard: 0,
            index: 'indexpattern_source',
            node: 'jtqB1-UhQluyjeXIpQFqAA',
            reason: {
              type: 'aggregation_execution_exception',
              reason: 'Unsupported script value [hello], expected a number, date, or boolean',
            },
          },
        ],
      },
    },
  },
};

const networkError = {
  stack: 'Error: Batch request failed with status 0',
  message: '[lens_merge_tables] > [esaggs] > Batch request failed with status 0',
  name: 'Error',
  original: {
    name: 'Error',
    message: 'Batch request failed with status 0',
    stack: 'Error: Batch request failed with status 0',
  },
};

// EsAggs will report an internal error when user attempts to use a runtime field on an indexpattern he has no access to
const indexpatternAccessError = {
  stack: "TypeError: Cannot read property 'values' of undefined\n",
  message: "[lens_merge_tables] > [esaggs] > Cannot read property 'values' of undefined",
  name: 'TypeError',
  original: {
    message: "[lens_merge_tables] > [esaggs] > Cannot read property 'values' of undefined",
    stack: "[lens_merge_tables] > [esaggs] > Cannot read property 'values' of undefined",
  },
};

const tsdbCounterUsedWithWrongOperationError = {
  stack:
    'Error: EsError: Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
  message:
    '[layeredXyVis] > [esaggs] > EsError: Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
  name: 'Error',
  original: {
    attributes: {
      type: 'status_exception',
      reason: 'error while executing search',
      caused_by: {
        type: 'search_phase_execution_exception',
        reason: 'all shards failed',
        phase: 'query',
        grouped: true,
        failed_shards: [
          {
            shard: 0,
            index: 'tsdb_index',
            reason: {
              type: 'illegal_argument_exception',
              reason:
                'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
            },
          },
        ],
        caused_by: {
          type: 'illegal_argument_exception',
          reason:
            'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
          caused_by: {
            type: 'illegal_argument_exception',
            reason:
              'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
          },
        },
      },
    },
    err: {
      message:
        'status_exception\n\tCaused by:\n\t\tsearch_phase_execution_exception: all shards failed',
      statusCode: 400,
      attributes: {
        type: 'status_exception',
        reason: 'error while executing search',
        caused_by: {
          type: 'search_phase_execution_exception',
          reason: 'all shards failed',
          phase: 'query',
          grouped: true,
          failed_shards: [
            {
              shard: 0,
              index: 'tsdb_index',
              reason: {
                type: 'illegal_argument_exception',
                reason:
                  'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
              },
            },
          ],
          caused_by: {
            type: 'illegal_argument_exception',
            reason:
              'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
            caused_by: {
              type: 'illegal_argument_exception',
              reason:
                'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
            },
          },
        },
      },
    },
  },
};

describe('lens_error_helpers', () => {
  describe('getOriginalRequestErrorMessages', () => {
    it('should report no errors if not parsable', () => {
      expect(getOriginalRequestErrorMessages(null, docLinksMock)).toEqual([]);
    });

    it('should report an error for a runtime field error', () => {
      expect(getOriginalRequestErrorMessages(runtimeFieldError, docLinksMock)).toEqual([
        expect.objectContaining({
          shortMessage:
            'Request error: number_format_exception, For input string: "hello" in "emit(Integer.parseInt(\'hello\'))" (Painless script)',
        }),
      ]);
    });

    it('should report an error for a scripted field error', () => {
      expect(getOriginalRequestErrorMessages(scriptedFieldError, docLinksMock)).toEqual([
        expect.objectContaining({
          shortMessage:
            'Request error: aggregation_execution_exception, Unsupported script value [hello], expected a number, date, or boolean in Painless script',
        }),
      ]);
    });

    it('should report the original es aggs error for runtime fields for indexpattern not accessible', () => {
      expect(
        getOriginalRequestErrorMessages(indexpatternAccessError as Error, docLinksMock)
      ).toEqual([
        expect.objectContaining({
          shortMessage: indexpatternAccessError.message,
        }),
      ]);
    });

    it("should report a network custom message when there's a network/connection problem", () => {
      expect(getOriginalRequestErrorMessages(networkError as Error, docLinksMock)).toEqual([
        expect.objectContaining({
          shortMessage: 'Network error, try again later or contact your administrator.',
        }),
      ]);
    });

    it('should report two specific errors in case of an unsupported operation applied to a TSDB counter', () => {
      expect(
        getOriginalRequestErrorMessages(
          tsdbCounterUsedWithWrongOperationError as Error,
          docLinksMock
        )
      ).toEqual([
        expect.objectContaining({
          shortMessage:
            'The field [bytes_counter] of Time series type [counter] has been used with the unsupported operation [sum].',
        }),
      ]);
    });
  });
});
