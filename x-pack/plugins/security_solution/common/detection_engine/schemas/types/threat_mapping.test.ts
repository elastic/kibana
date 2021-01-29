/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  concurrent_searches,
  items_per_search,
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

    test('it should fail validation with an extra entry item', () => {
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

    test('it should fail validation with a non string', () => {
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

    test('it should fail validation with a wrong type', () => {
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

  test('it should fail validate with an extra key', () => {
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

  test('it should fail validate with an extra inner entry', () => {
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

  test('it should fail validate with an extra inner entry with the wrong data type', () => {
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

  test('it should fail validate with empty array', () => {
    const payload: string[] = [];

    const decoded = threat_mapping.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "[]" supplied to "NonEmptyArray<ThreatMap>"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when concurrent_searches is < 0', () => {
    const payload = -1;
    const decoded = concurrent_searches.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "PositiveIntegerGreaterThanZero"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when concurrent_searches is 0', () => {
    const payload = 0;
    const decoded = concurrent_searches.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "PositiveIntegerGreaterThanZero"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when items_per_search is 0', () => {
    const payload = 0;
    const decoded = items_per_search.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "PositiveIntegerGreaterThanZero"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when items_per_search is < 0', () => {
    const payload = -1;
    const decoded = items_per_search.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "PositiveIntegerGreaterThanZero"',
    ]);
    expect(message.schema).toEqual({});
  });
});
