/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { escapeQueryValue } from '.';

const TEST_QUERIES = [
  {
    description: 'should not remove white spaces quotes',
    value: ' netcat',
    expected: ' netcat',
  },
  {
    description: 'should escape quotes',
    value: 'I said, "Hello."',
    expected: 'I said, \\"Hello.\\"',
  },
  {
    description: 'should escape special characters',
    value: `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`,
    expected: `This \\\\ has \\(a lot of\\) \\<special\\> characters, don't you \\*think\\*? \\"Yes.\\"`,
  },
  {
    description: 'should escape keywords',
    value: 'foo and bar or baz not qux',
    expected: 'foo \\and bar \\or baz \\not qux',
  },
  {
    description: 'should escape keywords next to each other',
    value: 'foo and bar or not baz',
    expected: 'foo \\and bar \\or \\not baz',
  },
  {
    description: 'should NOT escape keywords without surrounding spaces',
    value: 'And this has keywords, or does it not?',
    expected: 'And this has keywords, \\or does it not?',
  },
  {
    description: 'should escape uppercase keywords',
    value: 'foo AND bar',
    expected: 'foo \\AND bar',
  },
  {
    description: 'should escape special characters and NOT keywords',
    value: 'Hello, "world", and <nice> to meet you!',
    expected: 'Hello, \\"world\\", \\and \\<nice\\> to meet you!',
  },
  {
    description: 'should escape newlines and tabs',
    value: 'This\nhas\tnewlines\r\nwith\ttabs',
    expected: 'This\\nhas\\tnewlines\\r\\nwith\\ttabs',
  },
  {
    description: 'should escape backslashes',
    value: 'This\\has\\backslashes',
    expected: 'This\\\\has\\\\backslashes',
  },
  {
    description: 'should escape multiple backslashes and quotes',
    value: 'This\\ has 2" quotes & \\ 2 "backslashes',
    expected: 'This\\\\ has 2\\" quotes & \\\\ 2 \\"backslashes',
  },
  {
    description: 'should escape all special character according to kuery.peg SpecialCharacter rule',
    value: '\\():"*',
    expected: '\\\\\\(\\)\\:\\"\\*',
  },
];

describe('Kuery escape', () => {
  it.each(TEST_QUERIES)('$description', ({ description, value, expected }) => {
    const result = escapeQueryValue(value);
    expect(result).to.be(`"${expected}"`);
  });
});
