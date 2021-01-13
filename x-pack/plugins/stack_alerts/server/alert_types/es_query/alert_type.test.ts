/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { Writable } from '@kbn/utility-types';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { getAlertType } from './alert_type';
import { EsQueryAlertParams } from './alert_type_params';

describe('alertType', () => {
  const logger = loggingSystemMock.create().get();

  const alertType = getAlertType(logger);

  it('alert type creation structure is the expected value', async () => {
    expect(alertType.id).toBe('.es-query');
    expect(alertType.name).toBe('ES query');
    expect(alertType.actionGroups).toEqual([
      { id: 'doc count threshold met', name: 'Doc count threshold met' },
    ]);

    expect(alertType.actionVariables).toMatchInlineSnapshot(`
      Object {
        "context": Array [
          Object {
            "description": "A pre-constructed message for the alert.",
            "name": "message",
          },
          Object {
            "description": "A pre-constructed title for the alert.",
            "name": "title",
          },
          Object {
            "description": "The date the alert met the threshold condition.",
            "name": "date",
          },
          Object {
            "description": "The value that met the threshold condition.",
            "name": "value",
          },
          Object {
            "description": "A string describing the threshold condition.",
            "name": "conditions",
          },
        ],
        "params": Array [
          Object {
            "description": "index",
            "name": "index",
          },
          Object {
            "description": "timeField",
            "name": "timeField",
          },
          Object {
            "description": "esQuery",
            "name": "esQuery",
          },
          Object {
            "description": "timeWindowSize",
            "name": "timeWindowSize",
          },
          Object {
            "description": "timeWindowUnit",
            "name": "timeWindowUnit",
          },
          Object {
            "description": "threshold",
            "name": "threshold",
          },
          Object {
            "description": "thresholdComparator",
            "name": "thresholdComparator",
          },
        ],
      }
    `);
  });

  it('validator succeeds with valid params', async () => {
    const params: Partial<Writable<EsQueryAlertParams>> = {
      index: ['index-name'],
      timeField: 'time-field',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '<',
      threshold: [0],
    };

    expect(alertType.validate?.params?.validate(params)).toBeTruthy();
  });

  it('validator fails with invalid params - threshold', async () => {
    const paramsSchema = alertType.validate?.params;
    if (!paramsSchema) throw new Error('params validator not set');

    const params: Partial<Writable<EsQueryAlertParams>> = {
      index: ['index-name'],
      timeField: 'time-field',
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: 'between',
      threshold: [0],
    };

    expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: must have two elements for the \\"between\\" comparator"`
    );
  });
});
