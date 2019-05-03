/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { CtagsReader } from './ctags_reader';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

afterEach(() => {
  sinon.restore();
});

test('Read ctags for c', () => {
  const ctagsReader = new CtagsReader(new ConsoleLoggerFactory());
  ctagsReader.readLine('foo\tsample.c\t/^int foo(int a, int b) {$/;\"\tfunction\tline:8\tsignature:(int a, int b)');
  const tags = ctagsReader.getTags();
  expect(tags.length).toEqual(1);
  expect(tags[0].symbol).toEqual('foo');
  expect(tags[0].line).toEqual(8);
  expect(tags[0].type).toEqual('function');
  expect(tags[0].signature).toEqual('(int a, int b)');
  expect(tags[0].lineStart).toEqual(4);
  expect(tags[0].lineEnd).toEqual(7);
})

test('Read ctags for cxx', () => {
  const ctagsReader = new CtagsReader(new ConsoleLoggerFactory());
  ctagsReader.readLine('MemberFunc\tsample.cxx\t/^    int MemberFunc(int a, int b) const {$/;\"\tfunction\tline:22\tclass:SomeClass\tsignature:(int a, int b) const');
  const tags = ctagsReader.getTags();
  expect(tags.length).toEqual(1);
  expect(tags[0].symbol).toEqual('MemberFunc');
  expect(tags[0].line).toEqual(22);
  expect(tags[0].type).toEqual('function');
  expect(tags[0].clazz).toEqual('SomeClass');
  expect(tags[0].signature).toEqual('(int a, int b) const');
  expect(tags[0].lineStart).toEqual(8);
  expect(tags[0].lineEnd).toEqual(18);
})

test('Read ctags for java', () => {
  const ctagsReader = new CtagsReader(new ConsoleLoggerFactory());
  ctagsReader.readLine('Sample\thome/jobs/OpenGrokAnt/workspace/testdata/sources/java/Sample.java\t/^public class Sample {$/;\"\tclass\tline:25');
  const tags = ctagsReader.getTags();
  expect(tags.length).toEqual(1);
  expect(tags[0].symbol).toEqual('Sample');
  expect(tags[0].line).toEqual(25);
  expect(tags[0].type).toEqual('class');
  expect(tags[0].lineStart).toEqual(13);
  expect(tags[0].lineEnd).toEqual(19);
})
