/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import type { PerformBulkActionSchema } from './request_schema';
import { performBulkActionSchema, BulkAction, BulkActionEditType } from './request_schema';

const retrieveValidationMessage = (payload: unknown) => {
  const decoded = performBulkActionSchema.decode(payload);
  const checked = exactCheck(payload, decoded);
  return foldLeftRight(checked);
};

describe('Perform bulk action request schema', () => {
  describe('cases common to every bulk action', () => {
    // missing query means it will request for all rules
    test('valid request: missing query', () => {
      const payload: PerformBulkActionSchema = {
        query: undefined,
        action: BulkAction.enable,
      };
      const message = retrieveValidationMessage(payload);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('invalid request: missing action', () => {
      const payload: Omit<PerformBulkActionSchema, 'action'> = {
        query: 'name: test',
      };
      const message = retrieveValidationMessage(payload);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "action"',
        'Invalid value "undefined" supplied to "edit"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('invalid request: unknown action', () => {
      const payload: Omit<PerformBulkActionSchema, 'action'> & { action: 'unknown' } = {
        query: 'name: test',
        action: 'unknown',
      };
      const message = retrieveValidationMessage(payload);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "unknown" supplied to "action"',
        'Invalid value "undefined" supplied to "edit"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('invalid request: unknown property', () => {
      const payload = {
        query: 'name: test',
        action: BulkAction.enable,
        mock: ['id'],
      };
      const message = retrieveValidationMessage(payload);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "mock,["id"]"']);
      expect(message.schema).toEqual({});
    });

    test('invalid request: wrong type for ids', () => {
      const payload = {
        ids: 'mock',
        action: BulkAction.enable,
      };
      const message = retrieveValidationMessage(payload);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "mock" supplied to "ids"']);
      expect(message.schema).toEqual({});
    });
  });

  describe('bulk enable', () => {
    test('valid request', () => {
      const payload: PerformBulkActionSchema = {
        query: 'name: test',
        action: BulkAction.enable,
      };
      const message = retrieveValidationMessage(payload);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });

  describe('bulk disable', () => {
    test('valid request', () => {
      const payload: PerformBulkActionSchema = {
        query: 'name: test',
        action: BulkAction.disable,
      };
      const message = retrieveValidationMessage(payload);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });

  describe('bulk export', () => {
    test('valid request', () => {
      const payload: PerformBulkActionSchema = {
        query: 'name: test',
        action: BulkAction.export,
      };
      const message = retrieveValidationMessage(payload);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });

  describe('bulk delete', () => {
    test('valid request', () => {
      const payload: PerformBulkActionSchema = {
        query: 'name: test',
        action: BulkAction.delete,
      };
      const message = retrieveValidationMessage(payload);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });

  describe('bulk duplicate', () => {
    test('valid request', () => {
      const payload: PerformBulkActionSchema = {
        query: 'name: test',
        action: BulkAction.duplicate,
      };
      const message = retrieveValidationMessage(payload);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });

  describe('bulk edit', () => {
    describe('cases common to every type of editing', () => {
      test('invalid request: missing edit payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "edit" supplied to "action"',
          'Invalid value "undefined" supplied to "edit"',
        ]);
        expect(message.schema).toEqual({});
      });

      test('invalid request: specified edit payload for another action', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.enable,
          [BulkAction.edit]: [{ type: BulkActionEditType.set_tags, value: ['test-tag'] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([
          'invalid keys "edit,[{"type":"set_tags","value":["test-tag"]}]"',
        ]);
        expect(message.schema).toEqual({});
      });

      test('invalid request: wrong type for edit payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: { type: BulkActionEditType.set_tags, value: ['test-tag'] },
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "edit" supplied to "action"',
          'Invalid value "{"type":"set_tags","value":["test-tag"]}" supplied to "edit"',
        ]);
        expect(message.schema).toEqual({});
      });
    });

    describe('tags', () => {
      test('invalid request: wrong tags type', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.set_tags, value: 'test-tag' }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "edit" supplied to "action"',
          'Invalid value "test-tag" supplied to "edit,value"',
          'Invalid value "set_tags" supplied to "edit,type"',
        ]);
        expect(message.schema).toEqual({});
      });

      test('valid request: add_tags edit action', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.add_tags, value: ['test-tag'] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });

      test('valid request: set_tags edit action', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.set_tags, value: ['test-tag'] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });

      test('valid request: delete_tags edit action', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.delete_tags, value: ['test-tag'] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });
    });

    describe('index_patterns', () => {
      test('invalid request: wrong index_patterns type', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.set_tags, value: 'logs-*' }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "edit" supplied to "action"',
          'Invalid value "logs-*" supplied to "edit,value"',
          'Invalid value "set_tags" supplied to "edit,type"',
        ]);
        expect(message.schema).toEqual({});
      });

      test('valid request: set_index_patterns edit action', () => {
        const payload: PerformBulkActionSchema = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.set_index_patterns, value: ['logs-*'] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });

      test('valid request: add_index_patterns edit action', () => {
        const payload: PerformBulkActionSchema = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.add_index_patterns, value: ['logs-*'] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });

      test('valid request: delete_index_patterns edit action', () => {
        const payload: PerformBulkActionSchema = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            { type: BulkActionEditType.delete_index_patterns, value: ['logs-*'] },
          ],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });
    });

    describe('timeline', () => {
      test('invalid request: wrong timeline payload type', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.set_timeline, value: [] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "edit" supplied to "action"',
          'Invalid value "set_timeline" supplied to "edit,type"',
          'Invalid value "[]" supplied to "edit,value"',
        ]);
        expect(message.schema).toEqual({});
      });

      test('invalid request: missing timeline_id', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.set_timeline,
              value: {
                timeline_title: 'Test timeline title',
              },
            },
          ],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual(
          expect.arrayContaining([
            'Invalid value "{"timeline_title":"Test timeline title"}" supplied to "edit,value"',
            'Invalid value "undefined" supplied to "edit,value,timeline_id"',
          ])
        );
        expect(message.schema).toEqual({});
      });

      test('valid request: set_timeline edit action', () => {
        const payload: PerformBulkActionSchema = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.set_timeline,
              value: {
                timeline_id: 'timelineid',
                timeline_title: 'Test timeline title',
              },
            },
          ],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });
    });

    describe('schedules', () => {
      test('invalid request: wrong schedules payload type', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.set_schedule, value: [] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "edit" supplied to "action"',
          'Invalid value "set_schedule" supplied to "edit,type"',
          'Invalid value "[]" supplied to "edit,value"',
        ]);
        expect(message.schema).toEqual({});
      });

      test('invalid request: wrong type of payload data', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.set_schedule,
              value: {
                interval: '-10m',
                lookback: '1m',
              },
            },
          ],
        } as PerformBulkActionSchema;

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual(
          expect.arrayContaining([
            'Invalid value "edit" supplied to "action"',
            'Invalid value "{"interval":"-10m","lookback":"1m"}" supplied to "edit,value"',
            'Invalid value "-10m" supplied to "edit,value,interval"',
          ])
        );
        expect(message.schema).toEqual({});
      });

      test('invalid request: missing interval', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.set_schedule,
              value: {
                lookback: '1m',
              },
            },
          ],
        } as PerformBulkActionSchema;

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual(
          expect.arrayContaining([
            'Invalid value "edit" supplied to "action"',
            'Invalid value "{"lookback":"1m"}" supplied to "edit,value"',
            'Invalid value "undefined" supplied to "edit,value,interval"',
          ])
        );
        expect(message.schema).toEqual({});
      });

      test('invalid request: missing lookback', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.set_schedule,
              value: {
                interval: '1m',
              },
            },
          ],
        } as PerformBulkActionSchema;

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual(
          expect.arrayContaining([
            'Invalid value "edit" supplied to "action"',
            'Invalid value "{"interval":"1m"}" supplied to "edit,value"',
            'Invalid value "undefined" supplied to "edit,value,lookback"',
          ])
        );
        expect(message.schema).toEqual({});
      });

      test('valid request: set_schedule edit action', () => {
        const payload: PerformBulkActionSchema = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.set_schedule,
              value: {
                interval: '1m',
                lookback: '1m',
              },
            },
          ],
        } as PerformBulkActionSchema;

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });
    });

    describe('rule actions', () => {
      test('invalid request: invalid rule actions payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [{ type: BulkActionEditType.add_rule_actions, value: [] }],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual(
          expect.arrayContaining(['Invalid value "[]" supplied to "edit,value"'])
        );
        expect(message.schema).toEqual({});
      });

      test('invalid request: missing throttle in payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.add_rule_actions,
              value: {
                actions: [],
              },
            },
          ],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual(
          expect.arrayContaining(['Invalid value "undefined" supplied to "edit,value,throttle"'])
        );
        expect(message.schema).toEqual({});
      });

      test('invalid request: missing actions in payload', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.add_rule_actions,
              value: {
                throttle: '1h',
              },
            },
          ],
        };

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual(
          expect.arrayContaining(['Invalid value "undefined" supplied to "edit,value,actions"'])
        );
        expect(message.schema).toEqual({});
      });

      test('invalid request: invalid action_type_id property in actions array', () => {
        const payload = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.add_rule_actions,
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

        const message = retrieveValidationMessage(payload);
        expect(getPaths(left(message.errors))).toEqual(
          expect.arrayContaining(['invalid keys "action_type_id"'])
        );
        expect(message.schema).toEqual({});
      });

      test('valid request: add_rule_actions edit action', () => {
        const payload: PerformBulkActionSchema = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.add_rule_actions,
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

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });

      test('valid request: set_rule_actions edit action', () => {
        const payload: PerformBulkActionSchema = {
          query: 'name: test',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.set_rule_actions,
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

        const message = retrieveValidationMessage(payload);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });
    });
  });
});
