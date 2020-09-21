/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ThreatMapping,
  threatMappingEntries,
  ThreatMappingEntries,
  threat_mapping,
} from './threat_mapping';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { exactCheck } from '../../../exact_check';

describe('threat_mapping', () => {
  describe('threatMappingEntries', () => {
    test('it should validate an entry', () => {
      const payload: ThreatMappingEntries = [
        {
          field: 'field.one',
          type: 'mapping',
          value: 'field.one',
        },
      ];
      const decoded = threatMappingEntries.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate an extra entry item', () => {
      const payload: ThreatMappingEntries & Array<{ extra: string }> = [
        {
          field: 'field.one',
          type: 'mapping',
          value: 'field.one',
          extra: 'blah',
        },
      ];
      const decoded = threatMappingEntries.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['invalid keys "extra"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a non string', () => {
      const payload = ([
        {
          field: 5,
          type: 'mapping',
          value: 'field.one',
        },
      ] as unknown) as ThreatMappingEntries[];
      const decoded = threatMappingEntries.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "field"']);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a wrong type', () => {
      const payload = ([
        {
          field: 'field.one',
          type: 'invalid',
          value: 'field.one',
        },
      ] as unknown) as ThreatMappingEntries[];
      const decoded = threatMappingEntries.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "invalid" supplied to "type"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('threat_mapping', () => {
    test('it should validate a threat mapping', () => {
      const payload: ThreatMapping = [
        {
          entries: [
            {
              field: 'field.one',
              type: 'mapping',
              value: 'field.one',
            },
          ],
        },
      ];
      const decoded = threat_mapping.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });

  test('it should NOT validate an extra key', () => {
    const payload: ThreatMapping & Array<{ extra: string }> = [
      {
        entries: [
          {
            field: 'field.one',
            type: 'mapping',
            value: 'field.one',
          },
        ],
        extra: 'invalid',
      },
    ];

    const decoded = threat_mapping.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extra"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an extra inner entry', () => {
    const payload: ThreatMapping & Array<{ entries: Array<{ extra: string }> }> = [
      {
        entries: [
          {
            field: 'field.one',
            type: 'mapping',
            value: 'field.one',
            extra: 'blah',
          },
        ],
      },
    ];

    const decoded = threat_mapping.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extra"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an extra inner entry with the wrong data type', () => {
    const payload = ([
      {
        entries: [
          {
            field: 5,
            type: 'mapping',
            value: 'field.one',
          },
        ],
      },
    ] as unknown) as ThreatMapping;

    const decoded = threat_mapping.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "entries,field"',
    ]);
    expect(message.schema).toEqual({});
  });
});
