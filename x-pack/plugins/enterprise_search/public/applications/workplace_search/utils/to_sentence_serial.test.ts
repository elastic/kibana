/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSentenceSerial } from './to_sentence_serial';

describe('toSentenceSerial', () => {
  it('works correctly for 1 word', () => {
    expect(toSentenceSerial(['One'])).toEqual('One');
  });

  it('works correctly for 2 words', () => {
    expect(toSentenceSerial(['One', 'Two'])).toEqual('One and Two');
  });

  it('works correctly for 3+ words', () => {
    expect(toSentenceSerial(['One', 'Two', 'Three'])).toEqual('One, Two, and Three');
  });
});
