/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, to } from './shared';

describe('shared', () => {
  describe('deserialization helpers', () => {
    // This is the text that will be passed to the text input
    test('to.escapeBackslashes', () => {
      // this input loaded from the server
      const input1 = 'my\ttab';
      expect(to.escapeBackslashes(input1)).toBe('my\\ttab');

      // this input loaded from the server
      const input2 = 'my\\ttab';
      expect(to.escapeBackslashes(input2)).toBe('my\\\\ttab');

      // this input loaded from the server
      const input3 = '\t\n\rOK';
      expect(to.escapeBackslashes(input3)).toBe('\\t\\n\\rOK');

      const input4 = `%{clientip} %{ident} %{auth} [%{@timestamp}] \"%{verb} %{request} HTTP/%{httpversion}\" %{status} %{size}`;
      expect(to.escapeBackslashes(input4)).toBe(
        '%{clientip} %{ident} %{auth} [%{@timestamp}] \\"%{verb} %{request} HTTP/%{httpversion}\\" %{status} %{size}'
      );
    });
  });

  describe('serialization helpers', () => {
    test('from.unescapeBackslashes', () => {
      // user typed in "my\ttab"
      const input1 = 'my\\ttab';
      expect(from.unescapeBackslashes(input1)).toBe('my\ttab');

      // user typed in "my\\tab"
      const input2 = 'my\\\\ttab';
      expect(from.unescapeBackslashes(input2)).toBe('my\\ttab');

      // user typed in "\t\n\rOK"
      const input3 = '\\t\\n\\rOK';
      expect(from.unescapeBackslashes(input3)).toBe('\t\n\rOK');

      const input5 = `%{clientip} %{ident} %{auth} [%{@timestamp}] \\"%{verb} %{request} HTTP/%{httpversion}\\" %{status} %{size}`;
      expect(from.unescapeBackslashes(input5)).toBe(
        `%{clientip} %{ident} %{auth} [%{@timestamp}] \"%{verb} %{request} HTTP/%{httpversion}\" %{status} %{size}`
      );
    });
  });
});
