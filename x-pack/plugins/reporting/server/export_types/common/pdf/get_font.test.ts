/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFont } from './get_font';

describe('getFont', () => {
  it(`returns 'noto-cjk' when matching cjk characters`, () => {
    const cjkStrings = [
      'vi-Hani: 关',
      'ko: 全',
      'ja: 入',
      'zh-Hant-HK: 免',
      'zh-Hant: 令',
      'zh-Hans: 令',
      'random: おあいい 漢字 あい 抵 令',
      String.fromCharCode(0x4ee4),
      String.fromCodePoint(0x9aa8),
    ];

    for (const cjkString of cjkStrings) {
      expect(getFont(cjkString)).toBe('noto-cjk');
    }
  });

  it(`returns 'Roboto' for non Han characters`, () => {
    expect(getFont('English text')).toBe('Roboto');
    expect(getFont('')).toBe('Roboto');
    expect(getFont(undefined!)).toBe('Roboto');
  });
});
