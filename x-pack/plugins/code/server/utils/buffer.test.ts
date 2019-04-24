/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractLines } from './buffer';
const text = `line0
line1
line2
line3
line4`;

const buffer = Buffer.from(text);

test('extract first line from buffer', () => {
  const lines = extractLines(buffer, 0, 1);
  expect(lines).toEqual('line0');
});

test('extract 2 lines from buffer', () => {
  const lines = extractLines(buffer, 1, 3);
  expect(lines).toEqual('line1\nline2');
});

test('extract all lines from buffer', () => {
  const lines = extractLines(buffer, 0, Number.MAX_VALUE);
  expect(lines).toEqual(text);
});

test('extract at least one line', () => {
  const oneLineText = Buffer.from('line0');
  const lines = extractLines(oneLineText, 0, 1);
  expect(lines).toEqual('line0');
});
