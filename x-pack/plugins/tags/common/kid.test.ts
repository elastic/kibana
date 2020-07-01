/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseKID, formatKID } from './kid';

describe('parseKID()', () => {
  test('parses correct fully specified KID', () => {
    const kid = parseKID('kid:default:expressions:expr:functions/kibana_context');
    expect(kid).toEqual({
      space: 'default',
      plugin: 'expressions',
      service: 'expr',
      path: ['functions', 'kibana_context'],
    });
  });

  test('parses partially specified KIDs', () => {
    const kid1 = parseKID('kid::canvas::elements/123');
    expect(kid1).toEqual({
      space: '',
      plugin: 'canvas',
      service: '',
      path: ['elements', '123'],
    });

    const kid2 = parseKID('kid:::so:saved_object/dashboard/123');
    expect(kid2).toEqual({
      space: '',
      plugin: '',
      service: 'so',
      path: ['saved_object', 'dashboard', '123'],
    });
  });

  test('throws on invalid kid protocol', () => {
    expect(() =>
      parseKID('kidz:default:expressions:expr:functions/kibana_context')
    ).toThrowErrorMatchingInlineSnapshot(`"Expected KID protocol to be \\"kid\\"."`);
  });

  test('throws when KID to few parts', () => {
    expect(() => parseKID('kid:default:expressions:expr')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid number of parts in KID."`
    );
    expect(() => parseKID('kid:default')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid number of parts in KID."`
    );
  });

  test('throws if KID is not a string', () => {
    expect(() => parseKID(123 as any)).toThrowErrorMatchingInlineSnapshot(
      `"KID must be a string."`
    );
  });

  test('throws if KID string is too long', () => {
    expect(() =>
      parseKID('kid:default:expressions:expr:functions' + '/kibana_context'.repeat(1000))
    ).toThrowErrorMatchingInlineSnapshot(`"KID stirng too long."`);
  });
});

describe('formatKID()', () => {
  test('formats fully specified KID', () => {
    const kid = formatKID({
      space: 'test',
      plugin: 'data',
      service: 'query',
      path: ['saved_query', 'bar'],
    });
    expect(kid).toBe('kid:test:data:query:saved_query/bar');
  });
});
