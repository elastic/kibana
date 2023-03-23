/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable } from 'stream';
import { MaxSizeStringBuilder } from './max_size_string_builder';

let content: string;
let stream: jest.Mocked<Writable>;

describe('MaxSizeStringBuilder', function () {
  beforeEach(() => {
    content = '';
    stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;
  });

  describe('tryAppend', function () {
    it(`should return true if appended string is under maxSize`, function () {
      const builder = new MaxSizeStringBuilder(stream, 100);
      const result = builder.tryAppend('aa');
      expect(result).toBe(true);
    });

    it(`should return false if appended string is over the maxSize`, function () {
      const builder = new MaxSizeStringBuilder(stream, 1);
      const result = builder.tryAppend('aa');
      expect(result).toBe(false);
    });

    it(`should return true then false if second appended string puts total size over the maxSize`, function () {
      const builder = new MaxSizeStringBuilder(stream, 1);
      expect(builder.tryAppend('a')).toBe(true);
      expect(builder.tryAppend('a')).toBe(false);
    });

    it('should write equivalent string if called once and less than maxSize', function () {
      const str = 'foo';
      const builder = new MaxSizeStringBuilder(stream, 100);
      builder.tryAppend(str);
      expect(content).toBe(str);
    });

    it('should write equivalent string if called multiple times and total size less than maxSize', function () {
      const strs = ['foo', 'bar', 'baz'];
      const builder = new MaxSizeStringBuilder(stream, 100);
      strs.forEach((str) => builder.tryAppend(str));
      expect(content).toBe(strs.join(''));
    });

    it('should write empty string if called one time with size greater than maxSize', function () {
      const str = 'aa'; // each a is one byte
      const builder = new MaxSizeStringBuilder(stream, 1);
      builder.tryAppend(str);
      expect(content).toBe('');
    });

    it('should write partial string if called multiple times with total size greater than maxSize', function () {
      const str = 'a'; // each a is one byte
      const builder = new MaxSizeStringBuilder(stream, 1);
      builder.tryAppend(str);
      builder.tryAppend(str);
      expect(content).toBe('a');
    });

    it('should write string with bom character prepended', function () {
      const str = 'a'; // each a is one byte
      const builder = new MaxSizeStringBuilder(stream, 1, '∆');
      builder.tryAppend(str);
      builder.tryAppend(str);
      expect(content).toBe('∆a');
    });
  });

  describe('getSizeInBytes', function () {
    it(`should return 0 when no strings have been appended`, function () {
      const builder = new MaxSizeStringBuilder(stream, 100);
      expect(builder.getSizeInBytes()).toBe(0);
    });

    it(`should return the size in bytes`, function () {
      const builder = new MaxSizeStringBuilder(stream, 100);
      const stringValue = 'foobar';
      builder.tryAppend(stringValue);
      expect(builder.getSizeInBytes()).toBe(stringValue.length);
    });
  });
});
