/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKQLStringParam, prepareKQLParam, prepareKQLStringParam } from './kql';

const testCases = [
  ['does NOT remove white spaces quotes', ' netcat', ' netcat'],
  ['escapes quotes', 'I said, "Hello."', 'I said, \\"Hello.\\"'],
  [
    'should escape special characters',
    `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`,
    `This \\ has (a lot of) <special> characters, don't you *think*? \\"Yes.\\"`,
  ],
  ['does NOT escape keywords', 'foo and bar or baz not qux', 'foo and bar or baz not qux'],
  [
    'does NOT escape keywords next to each other',
    'foo and bar or not baz',
    'foo and bar or not baz',
  ],
  [
    'does NOT escape keywords without surrounding spaces',
    'And this has keywords, or does it not?',
    'And this has keywords, or does it not?',
  ],
  [
    'does NOT escape uppercase keywords',
    'And this has keywords, or does it not?',
    'And this has keywords, or does it not?',
  ],
  ['does NOT escape uppercase keywords', 'foo AND bar', 'foo AND bar'],
  [
    'escapes special characters and NOT keywords',
    'Hello, "world", and <nice> to meet you!',
    'Hello, \\"world\\", and <nice> to meet you!',
  ],
  [
    'escapes newlines and tabs',
    'This\nhas\tnewlines\r\nwith\ttabs',
    'This\\nhas\\tnewlines\\r\\nwith\\ttabs',
  ],
];

describe('prepareKQLParam', () => {
  it.each(testCases)('%s', (_, input, expected) => {
    expect(prepareKQLParam(input)).toBe(`"${expected}"`);
  });

  it('stringifies numbers without enclosing by quotes', () => {
    const input = 10;
    const expected = '10';

    expect(prepareKQLParam(input)).toBe(expected);
  });

  it('stringifies booleans without enclosing by quotes', () => {
    const input = true;
    const expected = 'true';

    expect(prepareKQLParam(input)).toBe(expected);
  });
});

describe('prepareKQLStringParam', () => {
  it.each(testCases)('%s', (_, input, expected) => {
    expect(prepareKQLStringParam(input)).toBe(`"${expected}"`);
  });
});

describe('escapeKQLStringParam', () => {
  it.each(testCases)('%s', (_, input, expected) => {
    expect(escapeKQLStringParam(input)).toBe(expected);
  });
});
