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

test('by default, encodes URI', () => {
  const url = 'https://elastic.co?foo=head%26shoulders';
  expect(compile(url, {})).not.toBe(url);
  expect(compile(url, {})).toBe('https://elastic.co?foo=head%2526shoulders');
});

test('when URI encoding is disabled, should not encode URI', () => {
  const url =
    'https://xxxxx.service-now.com/nav_to.do?uri=incident.do%3Fsys_id%3D-1%26sysparm_query%3Dshort_description%3DHello';
  expect(compile(url, {}, true)).toBe(url);
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

describe('formatNumber helper', () => {
  test('formats string numbers', () => {
    const url = 'https://elastic.co/{{formatNumber value "0.0"}}';
    expect(compile(url, { value: '32.9999' })).toMatchInlineSnapshot(`"https://elastic.co/33.0"`);
    expect(compile(url, { value: '32.555' })).toMatchInlineSnapshot(`"https://elastic.co/32.6"`);
  });

  test('formats numbers', () => {
    const url = 'https://elastic.co/{{formatNumber value "0.0"}}';
    expect(compile(url, { value: 32.9999 })).toMatchInlineSnapshot(`"https://elastic.co/33.0"`);
    expect(compile(url, { value: 32.555 })).toMatchInlineSnapshot(`"https://elastic.co/32.6"`);
  });

  test("doesn't fail on Nan", () => {
    const url = 'https://elastic.co/{{formatNumber value "0.0"}}';
    expect(compile(url, { value: null })).toMatchInlineSnapshot(`"https://elastic.co/"`);
    expect(compile(url, { value: undefined })).toMatchInlineSnapshot(`"https://elastic.co/"`);
    expect(compile(url, { value: 'not a number' })).toMatchInlineSnapshot(
      `"https://elastic.co/not%20a%20number"`
    );
  });

  test('fails on missing format string', () => {
    const url = 'https://elastic.co/{{formatNumber value}}';
    expect(() => compile(url, { value: 12 })).toThrowError();
  });

  // this doesn't work and doesn't seem
  // possible to validate with our version of numeral
  test.skip('fails on malformed format string', () => {
    const url = 'https://elastic.co/{{formatNumber value "not a real format string"}}';
    expect(() => compile(url, { value: 12 })).toThrowError();
  });
});

describe('replace helper', () => {
  test('replaces all occurrences', () => {
    const url = 'https://elastic.co/{{replace value "replace-me" "with-me"}}';

    expect(compile(url, { value: 'replace-me test replace-me' })).toMatchInlineSnapshot(
      `"https://elastic.co/with-me%20test%20with-me"`
    );
  });

  test('can be used to remove a substring', () => {
    const url = 'https://elastic.co/{{replace value "Label:" ""}}';

    expect(compile(url, { value: 'Label:Feature:Something' })).toMatchInlineSnapshot(
      `"https://elastic.co/Feature:Something"`
    );
  });

  test('works if no matches', () => {
    const url = 'https://elastic.co/{{replace value "Label:" ""}}';

    expect(compile(url, { value: 'No matches' })).toMatchInlineSnapshot(
      `"https://elastic.co/No%20matches"`
    );
  });

  test('throws on incorrect args', () => {
    expect(() =>
      compile('https://elastic.co/{{replace value "Label:"}}', { value: 'No matches' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[replace]: \\"searchString\\" and \\"valueString\\" parameters expected to be strings, but not a string or missing"`
    );
    expect(() =>
      compile('https://elastic.co/{{replace value "Label:" 4}}', { value: 'No matches' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[replace]: \\"searchString\\" and \\"valueString\\" parameters expected to be strings, but not a string or missing"`
    );
    expect(() =>
      compile('https://elastic.co/{{replace value 4 ""}}', { value: 'No matches' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[replace]: \\"searchString\\" and \\"valueString\\" parameters expected to be strings, but not a string or missing"`
    );
    expect(() =>
      compile('https://elastic.co/{{replace value}}', { value: 'No matches' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[replace]: \\"searchString\\" and \\"valueString\\" parameters expected to be strings, but not a string or missing"`
    );
  });
});

describe('basic string formatting helpers', () => {
  test('lowercase', () => {
    const compileUrl = (value: unknown) =>
      compile('https://elastic.co/{{lowercase value}}', { value });

    expect(compileUrl('Some String Value')).toMatchInlineSnapshot(
      `"https://elastic.co/some%20string%20value"`
    );
    expect(compileUrl(4)).toMatchInlineSnapshot(`"https://elastic.co/4"`);
    expect(compileUrl(null)).toMatchInlineSnapshot(`"https://elastic.co/null"`);
  });
  test('uppercase', () => {
    const compileUrl = (value: unknown) =>
      compile('https://elastic.co/{{uppercase value}}', { value });

    expect(compileUrl('Some String Value')).toMatchInlineSnapshot(
      `"https://elastic.co/SOME%20STRING%20VALUE"`
    );
    expect(compileUrl(4)).toMatchInlineSnapshot(`"https://elastic.co/4"`);
    expect(compileUrl(null)).toMatchInlineSnapshot(`"https://elastic.co/NULL"`);
  });
  test('trim', () => {
    const compileUrl = (fn: 'trim' | 'trimLeft' | 'trimRight', value: unknown) =>
      compile(`https://elastic.co/{{${fn} value}}`, { value });

    expect(compileUrl('trim', '  trim-me  ')).toMatchInlineSnapshot(`"https://elastic.co/trim-me"`);
    expect(compileUrl('trimRight', '  trim-me  ')).toMatchInlineSnapshot(
      `"https://elastic.co/%20%20trim-me"`
    );
    expect(compileUrl('trimLeft', '  trim-me  ')).toMatchInlineSnapshot(
      `"https://elastic.co/trim-me%20%20"`
    );
  });
  test('left,right,mid', () => {
    const compileExpression = (expression: string, value: unknown) =>
      compile(`https://elastic.co/${expression}`, { value });

    expect(compileExpression('{{left value 3}}', '12345')).toMatchInlineSnapshot(
      `"https://elastic.co/123"`
    );
    expect(compileExpression('{{right value 3}}', '12345')).toMatchInlineSnapshot(
      `"https://elastic.co/345"`
    );
    expect(compileExpression('{{mid value 1 3}}', '12345')).toMatchInlineSnapshot(
      `"https://elastic.co/234"`
    );
  });

  test('concat', () => {
    expect(
      compile(`https://elastic.co/{{concat value1 "," value2}}`, { value1: 'v1', value2: 'v2' })
    ).toMatchInlineSnapshot(`"https://elastic.co/v1,v2"`);

    expect(
      compile(`https://elastic.co/{{concat valueArray}}`, { valueArray: ['1', '2', '3'] })
    ).toMatchInlineSnapshot(`"https://elastic.co/1,2,3"`);
  });

  test('split', () => {
    expect(
      compile(
        `https://elastic.co/{{lookup (split value ",") 0 }}&{{lookup (split value ",") 1 }}`,
        {
          value: '47.766201,-122.257057',
        }
      )
    ).toMatchInlineSnapshot(`"https://elastic.co/47.766201&-122.257057"`);

    expect(() =>
      compile(`https://elastic.co/{{split value}}`, { value: '47.766201,-122.257057' })
    ).toThrowErrorMatchingInlineSnapshot(`"[split] \\"splitter\\" expected to be a string"`);
  });
});
