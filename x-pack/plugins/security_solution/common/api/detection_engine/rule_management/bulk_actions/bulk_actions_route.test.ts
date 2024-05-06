/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import {
  BulkActionEditTypeEnum,
  BulkActionTypeEnum,
  PerformBulkActionRequestBody,
} from './bulk_actions_route.gen';

describe('Perform bulk action request schema', () => {
  describe('cases common to every bulk action', () => {
    // missing query means it will request for all rules
    test('valid request: missing query', () => {
      const payload: PerformBulkActionRequestBody = {
        query: undefined,
        action: BulkActionTypeEnum.enable,
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);

      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('invalid request: missing action', () => {
      const payload: Omit<PerformBulkActionRequestBody, 'action'> = {
        query: 'name: test',
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 2 more"`
      );
    });

    test('invalid request: unknown action', () => {
      const payload: Omit<PerformBulkActionRequestBody, 'action'> & { action: 'unknown' } = {
        action: 'unknown',
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 2 more"`
      );
    });

    test('strips unknown properties', () => {
      const payload = {
        query: 'name: test',
        action: BulkActionTypeEnum.enable,
        mock: ['id'],
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual({
        query: 'name: test',
        action: BulkActionTypeEnum.enable,
      });
    });

    test('invalid request: wrong type for ids', () => {
      const payload = {
        ids: 'mock',
        action: BulkActionTypeEnum.enable,
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"ids: Expected array, received string, action: Invalid literal value, expected \\"delete\\", ids: Expected array, received string, action: Invalid literal value, expected \\"disable\\", ids: Expected array, received string, and 7 more"`
      );
    });
  });

  describe('bulk enable', () => {
    test('valid request', () => {
      const payload: PerformBulkActionRequestBody = {
        query: 'name: test',
        action: BulkActionTypeEnum.enable,
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  describe('bulk disable', () => {
    test('valid request', () => {
      const payload: PerformBulkActionRequestBody = {
        query: 'name: test',
        action: BulkActionTypeEnum.disable,
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  describe('bulk export', () => {
    test('valid request', () => {
      const payload: PerformBulkActionRequestBody = {
        query: 'name: test',
        action: BulkActionTypeEnum.export,
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  describe('bulk delete', () => {
    test('valid request', () => {
      const payload: PerformBulkActionRequestBody = {
        query: 'name: test',
        action: BulkActionTypeEnum.delete,
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  describe('bulk duplicate', () => {
    test('valid request', () => {
      const payload: PerformBulkActionRequestBody = {
        query: 'name: test',
        action: BulkActionTypeEnum.duplicate,
        [BulkActionTypeEnum.duplicate]: {
          include_exceptions: false,
          include_expired_exceptions: false,
        },
      };
      const result = PerformBulkActionRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });
  });

  describe('bulk edit', () => {
    describe('cases common to every type of editing', () => {
      test('invalid request: missing edit payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);
        expectParseError(result);

        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 1 more"`
        );
      });

      test('invalid request: wrong type for edit payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: { type: BulkActionEditTypeEnum.set_tags, value: ['test-tag'] },
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);
        expectParseError(result);

        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 1 more"`
        );
      });
    });

    describe('tags', () => {
      test('invalid request: wrong tags type', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [{ type: BulkActionEditTypeEnum.set_tags, value: 'test-tag' }],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);
        expectParseError(result);

        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 11 more"`
        );
      });

      test('valid request: add_tags edit action', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            { type: BulkActionEditTypeEnum.add_tags, value: ['test-tag'] },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });

      test('valid request: set_tags edit action', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            { type: BulkActionEditTypeEnum.set_tags, value: ['test-tag'] },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });

      test('valid request: delete_tags edit action', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            { type: BulkActionEditTypeEnum.delete_tags, value: ['test-tag'] },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });

    describe('index_patterns', () => {
      test('invalid request: wrong index_patterns type', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [{ type: BulkActionEditTypeEnum.set_tags, value: 'logs-*' }],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);
        expectParseError(result);

        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 11 more"`
        );
      });

      test('valid request: set_index_patterns edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            { type: BulkActionEditTypeEnum.set_index_patterns, value: ['logs-*'] },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });

      test('valid request: add_index_patterns edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            { type: BulkActionEditTypeEnum.add_index_patterns, value: ['logs-*'] },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });

      test('valid request: delete_index_patterns edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            { type: BulkActionEditTypeEnum.delete_index_patterns, value: ['logs-*'] },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });

    describe('investigation_fields', () => {
      test('valid request: set_investigation_fields edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_investigation_fields,
              value: { field_names: ['field-1'] },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });

      test('valid request: add_investigation_fields edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.add_investigation_fields,
              value: { field_names: ['field-2'] },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });

      test('valid request: delete_investigation_fields edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.delete_investigation_fields,
              value: { field_names: ['field-3'] },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });

    describe('timeline', () => {
      test('invalid request: wrong timeline payload type', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [{ type: BulkActionEditTypeEnum.set_timeline, value: [] }],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 9 more"`
        );
      });

      test('invalid request: missing timeline_id', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_timeline,
              value: {
                timeline_title: 'Test timeline title',
              },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 12 more"`
        );
      });

      test('valid request: set_timeline edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_timeline,
              value: {
                timeline_id: 'timelineid',
                timeline_title: 'Test timeline title',
              },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });

    describe('schedules', () => {
      test('invalid request: wrong schedules payload type', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [{ type: BulkActionEditTypeEnum.set_schedule, value: [] }],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 9 more"`
        );
      });

      test('invalid request: wrong type of payload data', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_schedule,
              value: {
                interval: '-10m',
                lookback: '1m',
              },
            },
          ],
        } as PerformBulkActionRequestBody;

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"edit.0.value.interval: Invalid"`
        );
      });

      test('invalid request: missing interval', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_schedule,
              value: {
                lookback: '1m',
              },
            },
          ],
        } as PerformBulkActionRequestBody;

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 12 more"`
        );
      });

      test('invalid request: missing lookback', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_schedule,
              value: {
                interval: '1m',
              },
            },
          ],
        } as PerformBulkActionRequestBody;

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 12 more"`
        );
      });

      test('valid request: set_schedule edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_schedule,
              value: {
                interval: '1m',
                lookback: '1m',
              },
            },
          ],
        } as PerformBulkActionRequestBody;

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });

    describe('rule actions', () => {
      test('invalid request: invalid rule actions payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [{ type: BulkActionEditTypeEnum.add_rule_actions, value: [] }],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 9 more"`
        );
      });

      test('invalid request: missing actions in payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.add_rule_actions,
              value: {
                throttle: '1h',
              },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"action: Invalid literal value, expected \\"delete\\", action: Invalid literal value, expected \\"disable\\", action: Invalid literal value, expected \\"enable\\", action: Invalid literal value, expected \\"export\\", action: Invalid literal value, expected \\"duplicate\\", and 13 more"`
        );
      });

      test('invalid request: invalid action_type_id property in actions array', () => {
        const payload = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.add_rule_actions,
              value: {
                throttle: '1h',
                actions: [
                  {
                    action_type_id: '.webhook',
                    group: 'default',
                    id: '458a50e0-1a28-11ed-9098-47fd8e1f3345',
                    params: {
                      body: {
                        rule_id: '{{rule.id}}',
                      },
                    },
                  },
                ],
              },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"edit.0.value.actions.0: Unrecognized key(s) in object: 'action_type_id'"`
        );
      });

      test('valid request: add_rule_actions edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.add_rule_actions,
              value: {
                throttle: '1h',
                actions: [
                  {
                    group: 'default',
                    id: '458a50e0-1a28-11ed-9098-47fd8e1f3345',
                    params: {
                      body: {
                        rule_id: '{{rule.id}}',
                      },
                    },
                  },
                ],
              },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });

      test('valid request: set_rule_actions edit action', () => {
        const payload: PerformBulkActionRequestBody = {
          query: 'name: test',
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_rule_actions,
              value: {
                throttle: '1h',
                actions: [
                  {
                    group: 'default',
                    id: '458a50e0-1a28-11ed-9098-47fd8e1f3345',
                    params: {
                      documents: [
                        {
                          rule_id: '{{rule.id}}',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };

        const result = PerformBulkActionRequestBody.safeParse(payload);

        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });
  });
});
