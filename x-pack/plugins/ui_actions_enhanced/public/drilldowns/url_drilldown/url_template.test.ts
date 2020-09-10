/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compile } from './url_template';
import moment from 'moment-timezone';

test('should compile url without variables', () => {
  const url = 'https://elastic.co';
  expect(compile(url, {})).toBe(url);
});

test('should fail on unknown syntax', () => {
  const url = 'https://elastic.co/{{}';
  expect(() => compile(url, {})).toThrowError();
});

test('should fail on not existing variable', () => {
  const url = 'https://elastic.co/{{fake}}';
  expect(() => compile(url, {})).toThrowError();
});

test('should fail on not existing nested variable', () => {
  const url = 'https://elastic.co/{{fake.fake}}';
  expect(() => compile(url, { fake: {} })).toThrowError();
});

test('should replace existing variable', () => {
  const url = 'https://elastic.co/{{foo}}';
  expect(compile(url, { foo: 'bar' })).toMatchInlineSnapshot(`"https://elastic.co/bar"`);
});

test('should fail on unknown helper', () => {
  const url = 'https://elastic.co/{{fake foo}}';
  expect(() => compile(url, { foo: 'bar' })).toThrowError();
});

describe('json helper', () => {
  test('should replace with json', () => {
    const url = 'https://elastic.co/{{json foo bar}}';
    expect(compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toMatchInlineSnapshot(
      `"https://elastic.co/%5B%7B%22foo%22:%22bar%22%7D,%7B%22bar%22:%22foo%22%7D%5D"`
    );
  });
  test('should replace with json and skip encoding', () => {
    const url = 'https://elastic.co/{{{json foo bar}}}';
    expect(compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toMatchInlineSnapshot(
      `"https://elastic.co/%5B%7B%22foo%22:%22bar%22%7D,%7B%22bar%22:%22foo%22%7D%5D"`
    );
  });
  test('should throw on unknown key', () => {
    const url = 'https://elastic.co/{{{json fake}}}';
    expect(() => compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toThrowError();
  });
});

describe('rison helper', () => {
  test('should replace with rison', () => {
    const url = 'https://elastic.co/{{rison foo bar}}';
    expect(compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toMatchInlineSnapshot(
      `"https://elastic.co/!((foo:bar),(bar:foo))"`
    );
  });
  test('should replace with rison and skip encoding', () => {
    const url = 'https://elastic.co/{{{rison foo bar}}}';
    expect(compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toMatchInlineSnapshot(
      `"https://elastic.co/!((foo:bar),(bar:foo))"`
    );
  });
  test('should throw on unknown key', () => {
    const url = 'https://elastic.co/{{{rison fake}}}';
    expect(() => compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toThrowError();
  });
});

describe('date helper', () => {
  let spy: jest.SpyInstance;
  const date = new Date('2020-08-18T14:45:00.000Z');
  beforeAll(() => {
    spy = jest.spyOn(global.Date, 'now').mockImplementation(() => date.valueOf());
    moment.tz.setDefault('UTC');
  });
  afterAll(() => {
    spy.mockRestore();
    moment.tz.setDefault('Browser');
  });

  test('uses datemath', () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(compile(url, { time: 'now' })).toMatchInlineSnapshot(
      `"https://elastic.co/2020-08-18T14:45:00.000Z"`
    );
  });

  test('can use format', () => {
    const url = 'https://elastic.co/{{date time "dddd, MMMM Do YYYY, h:mm:ss a"}}';
    expect(compile(url, { time: 'now' })).toMatchInlineSnapshot(
      `"https://elastic.co/Tuesday,%20August%2018th%202020,%202:45:00%20pm"`
    );
  });

  test('throws if missing variable', () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(() => compile(url, {})).toThrowError();
  });

  test("doesn't throw if non valid date", () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(compile(url, { time: 'fake' })).toMatchInlineSnapshot(`"https://elastic.co/fake"`);
  });

  test("doesn't throw on boolean or number", () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(compile(url, { time: false })).toMatchInlineSnapshot(`"https://elastic.co/false"`);
    expect(compile(url, { time: 24 })).toMatchInlineSnapshot(
      `"https://elastic.co/1970-01-01T00:00:00.024Z"`
    );
  });

  test('works with ISO string', () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(compile(url, { time: date.toISOString() })).toMatchInlineSnapshot(
      `"https://elastic.co/2020-08-18T14:45:00.000Z"`
    );
  });

  test('works with ts', () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(compile(url, { time: date.valueOf() })).toMatchInlineSnapshot(
      `"https://elastic.co/2020-08-18T14:45:00.000Z"`
    );
  });
  test('works with ts string', () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(compile(url, { time: String(date.valueOf()) })).toMatchInlineSnapshot(
      `"https://elastic.co/2020-08-18T14:45:00.000Z"`
    );
  });
});
