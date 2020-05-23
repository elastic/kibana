/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestReadable } from '../mocks';

import { BufferLines } from './buffer_lines';

describe('buffer_lines', () => {
  test('it can read a single line', done => {
    const input = new TestReadable();
    input.push('line one\n');
    input.push(null);
    const bufferedLine = new BufferLines({ input });
    let linesToTest: string[] = [];
    bufferedLine.on('lines', (lines: string[]) => {
      linesToTest = [...linesToTest, ...lines];
    });
    bufferedLine.on('close', () => {
      expect(linesToTest).toEqual(['line one']);
      done();
    });
  });

  test('it can read two lines', done => {
    const input = new TestReadable();
    input.push('line one\n');
    input.push('line two\n');
    input.push(null);
    const bufferedLine = new BufferLines({ input });
    let linesToTest: string[] = [];
    bufferedLine.on('lines', (lines: string[]) => {
      linesToTest = [...linesToTest, ...lines];
    });
    bufferedLine.on('close', () => {
      expect(linesToTest).toEqual(['line one', 'line two']);
      done();
    });
  });

  test('two identical lines are collapsed into just one line without duplicates', done => {
    const input = new TestReadable();
    input.push('line one\n');
    input.push('line one\n');
    input.push(null);
    const bufferedLine = new BufferLines({ input });
    let linesToTest: string[] = [];
    bufferedLine.on('lines', (lines: string[]) => {
      linesToTest = [...linesToTest, ...lines];
    });
    bufferedLine.on('close', () => {
      expect(linesToTest).toEqual(['line one']);
      done();
    });
  });

  test('it can close out without writing any lines', done => {
    const input = new TestReadable();
    input.push(null);
    const bufferedLine = new BufferLines({ input });
    let linesToTest: string[] = [];
    bufferedLine.on('lines', (lines: string[]) => {
      linesToTest = [...linesToTest, ...lines];
    });
    bufferedLine.on('close', () => {
      expect(linesToTest).toEqual([]);
      done();
    });
  });

  test('it can read 200 lines', done => {
    const input = new TestReadable();
    const bufferedLine = new BufferLines({ input });
    let linesToTest: string[] = [];
    const size200: string[] = new Array(200).fill(null).map((_, index) => `${index}\n`);
    size200.forEach(element => input.push(element));
    input.push(null);
    bufferedLine.on('lines', (lines: string[]) => {
      linesToTest = [...linesToTest, ...lines];
    });
    bufferedLine.on('close', () => {
      expect(linesToTest.length).toEqual(200);
      done();
    });
  });
});
