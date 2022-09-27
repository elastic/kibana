/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFileName } from './parse_file_name';

describe('parseFileName', () => {
  test('file.png', () => {
    expect(parseFileName('file.png')).toEqual({
      name: 'file',
    });
  });

  test('  Something_*  really -=- strange.abc.wav', () => {
    expect(parseFileName('  Something_*  really -=- strange.abc.wav')).toEqual({
      name: 'Something__  really ___ strange_abc',
    });
  });

  test('!@#$%^&*()', () => {
    expect(parseFileName('!@#$%^&*()')).toEqual({
      name: '__________',
    });
  });

  test('reallylong.repeat(100).dmg', () => {
    expect(parseFileName('reallylong'.repeat(100) + '.dmg')).toEqual({
      name: 'reallylong'.repeat(100).slice(0, 256),
    });
  });
});
