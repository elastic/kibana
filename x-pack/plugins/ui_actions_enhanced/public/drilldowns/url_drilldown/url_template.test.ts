/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compile } from './url_template';
import moment from 'moment-timezone';

test('should compile url without variables', async () => {
  const url = 'https://elastic.co';
  expect(await compile(url, {})).toBe(url);
});

test('by default, encodes URI', async () => {
  const url = 'https://elastic.co?foo=head%26shoulders';
  expect(await compile(url, {})).not.toBe(url);
  expect(await compile(url, {})).toBe('https://elastic.co?foo=head%2526shoulders');
});

test('when URI encoding is disabled, should not encode URI', async () => {
  const url =
    'https://xxxxx.service-now.com/nav_to.do?uri=incident.do%3Fsys_id%3D-1%26sysparm_query%3Dshort_description%3DHello';
  expect(await compile(url, {}, false)).toBe(url);
});

test('should fail on unknown syntax', async () => {
  const url = 'https://elastic.co/{{}';
  await expect(() => compile(url, {})).rejects;
});

test('should fail on not existing variable', async () => {
  const url = 'https://elastic.co/{{fake}}';
  await expect(() => compile(url, {})).rejects;
});

test('should fail on not existing nested variable', async () => {
  const url = 'https://elastic.co/{{fake.fake}}';
  await expect(() => compile(url, { fake: {} })).rejects;
});

test('should replace existing variable', async () => {
  const url = 'https://elastic.co/{{foo}}';
  expect(await compile(url, { foo: 'bar' })).toMatchInlineSnapshot(`"https://elastic.co/bar"`);
});

test('should fail on unknown helper', async () => {
  const url = 'https://elastic.co/{{fake foo}}';
  await expect(() => compile(url, { foo: 'bar' })).rejects;
});

describe('json helper', () => {
  test('should replace with json', async () => {
    const url = 'https://elastic.co/{{json foo bar}}';
    expect(await compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toMatchInlineSnapshot(
      `"https://elastic.co/%5B%7B%22foo%22:%22bar%22%7D,%7B%22bar%22:%22foo%22%7D%5D"`
    );
  });
  test('should replace with json and skip encoding', async () => {
    const url = 'https://elastic.co/{{{json foo bar}}}';
    expect(await compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toMatchInlineSnapshot(
      `"https://elastic.co/%5B%7B%22foo%22:%22bar%22%7D,%7B%22bar%22:%22foo%22%7D%5D"`
    );
  });
  test('should throw on unknown key', async () => {
    const url = 'https://elastic.co/{{{json fake}}}';
    await expect(() => compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).rejects;
  });
});

describe('rison helper', () => {
  test('should replace with rison', async () => {
    const url = 'https://elastic.co/{{rison foo bar}}';
    expect(await compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toMatchInlineSnapshot(
      `"https://elastic.co/!((foo:bar),(bar:foo))"`
    );
  });
  test('should replace with rison and skip encoding', async () => {
    const url = 'https://elastic.co/{{{rison foo bar}}}';
    expect(await compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).toMatchInlineSnapshot(
      `"https://elastic.co/!((foo:bar),(bar:foo))"`
    );
  });
  test('should throw on unknown key', async () => {
    const url = 'https://elastic.co/{{{rison fake}}}';
    await expect(() => compile(url, { foo: { foo: 'bar' }, bar: { bar: 'foo' } })).rejects;
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

  test('uses datemath', async () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(await compile(url, { time: 'now' })).toMatchInlineSnapshot(
      `"https://elastic.co/2020-08-18T14:45:00.000Z"`
    );
  });

  test('can use format', async () => {
    const url = 'https://elastic.co/{{date time "dddd, MMMM Do YYYY, h:mm:ss a"}}';
    expect(await compile(url, { time: 'now' })).toMatchInlineSnapshot(
      `"https://elastic.co/Tuesday,%20August%2018th%202020,%202:45:00%20pm"`
    );
  });

  test('throws if missing variable', async () => {
    const url = 'https://elastic.co/{{date time}}';
    await expect(() => compile(url, {})).rejects;
  });

  test("doesn't throw if non valid date", async () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(await compile(url, { time: 'fake' })).toMatchInlineSnapshot(`"https://elastic.co/fake"`);
  });

  test("doesn't throw on boolean or number", async () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(await compile(url, { time: false })).toMatchInlineSnapshot(`"https://elastic.co/false"`);
    expect(await compile(url, { time: 24 })).toMatchInlineSnapshot(
      `"https://elastic.co/1970-01-01T00:00:00.024Z"`
    );
  });

  test('works with ISO string', async () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(await compile(url, { time: date.toISOString() })).toMatchInlineSnapshot(
      `"https://elastic.co/2020-08-18T14:45:00.000Z"`
    );
  });

  test('works with ts', async () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(await compile(url, { time: date.valueOf() })).toMatchInlineSnapshot(
      `"https://elastic.co/2020-08-18T14:45:00.000Z"`
    );
  });
  test('works with ts string', async () => {
    const url = 'https://elastic.co/{{date time}}';
    expect(await compile(url, { time: String(date.valueOf()) })).toMatchInlineSnapshot(
      `"https://elastic.co/2020-08-18T14:45:00.000Z"`
    );
  });
});

describe('formatNumber helper', () => {
  test('formats string numbers', async () => {
    const url = 'https://elastic.co/{{formatNumber value "0.0"}}';
    expect(await compile(url, { value: '32.9999' })).toMatchInlineSnapshot(
      `"https://elastic.co/33.0"`
    );
    expect(await compile(url, { value: '32.555' })).toMatchInlineSnapshot(
      `"https://elastic.co/32.6"`
    );
  });

  test('formats numbers', async () => {
    const url = 'https://elastic.co/{{formatNumber value "0.0"}}';
    expect(await compile(url, { value: 32.9999 })).toMatchInlineSnapshot(
      `"https://elastic.co/33.0"`
    );
    expect(await compile(url, { value: 32.555 })).toMatchInlineSnapshot(
      `"https://elastic.co/32.6"`
    );
  });

  test("doesn't fail on Nan", async () => {
    const url = 'https://elastic.co/{{formatNumber value "0.0"}}';
    expect(await compile(url, { value: null })).toMatchInlineSnapshot(`"https://elastic.co/"`);
    expect(await compile(url, { value: undefined })).toMatchInlineSnapshot(`"https://elastic.co/"`);
    expect(await compile(url, { value: 'not a number' })).toMatchInlineSnapshot(
      `"https://elastic.co/not%20a%20number"`
    );
  });

  test('fails on missing format string', async () => {
    const url = 'https://elastic.co/{{formatNumber value}}';
    await expect(() => compile(url, { value: 12 })).rejects;
  });

  // this doesn't work and doesn't seem
  // possible to validate with our version of numeral
  test.skip('fails on malformed format string', async () => {
    const url = 'https://elastic.co/{{formatNumber value "not a real format string"}}';
    await expect(() => compile(url, { value: 12 })).rejects;
  });
});

describe('replace helper', () => {
  test('replaces all occurrences', async () => {
    const url = 'https://elastic.co/{{replace value "replace-me" "with-me"}}';

    expect(await compile(url, { value: 'replace-me test replace-me' })).toMatchInlineSnapshot(
      `"https://elastic.co/with-me%20test%20with-me"`
    );
  });

  test('can be used to remove a substring', async () => {
    const url = 'https://elastic.co/{{replace value "Label:" ""}}';

    expect(await compile(url, { value: 'Label:Feature:Something' })).toMatchInlineSnapshot(
      `"https://elastic.co/Feature:Something"`
    );
  });

  test('works if no matches', async () => {
    const url = 'https://elastic.co/{{replace value "Label:" ""}}';

    expect(await compile(url, { value: 'No matches' })).toMatchInlineSnapshot(
      `"https://elastic.co/No%20matches"`
    );
  });

  test('throws on incorrect args', async () => {
    await expect(() =>
      compile('https://elastic.co/{{replace value "Label:"}}', { value: 'No matches' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[replace]: \\"searchString\\" and \\"valueString\\" parameters expected to be strings, but not a string or missing"`
    );
    await expect(() =>
      compile('https://elastic.co/{{replace value "Label:" 4}}', { value: 'No matches' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[replace]: \\"searchString\\" and \\"valueString\\" parameters expected to be strings, but not a string or missing"`
    );
    await expect(() =>
      compile('https://elastic.co/{{replace value 4 ""}}', { value: 'No matches' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[replace]: \\"searchString\\" and \\"valueString\\" parameters expected to be strings, but not a string or missing"`
    );
    await expect(() =>
      compile('https://elastic.co/{{replace value}}', { value: 'No matches' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[replace]: \\"searchString\\" and \\"valueString\\" parameters expected to be strings, but not a string or missing"`
    );
  });
});

describe('basic string formatting helpers', () => {
  test('lowercase', async () => {
    const compileUrl = (value: unknown) =>
      compile('https://elastic.co/{{lowercase value}}', { value });

    expect(await compileUrl('Some String Value')).toMatchInlineSnapshot(
      `"https://elastic.co/some%20string%20value"`
    );
    expect(await compileUrl(4)).toMatchInlineSnapshot(`"https://elastic.co/4"`);
    expect(await compileUrl(null)).toMatchInlineSnapshot(`"https://elastic.co/null"`);
  });
  test('uppercase', async () => {
    const compileUrl = (value: unknown) =>
      compile('https://elastic.co/{{uppercase value}}', { value });

    expect(await compileUrl('Some String Value')).toMatchInlineSnapshot(
      `"https://elastic.co/SOME%20STRING%20VALUE"`
    );
    expect(await compileUrl(4)).toMatchInlineSnapshot(`"https://elastic.co/4"`);
    expect(await compileUrl(null)).toMatchInlineSnapshot(`"https://elastic.co/NULL"`);
  });
  test('trim', async () => {
    const compileUrl = (fn: 'trim' | 'trimLeft' | 'trimRight', value: unknown) =>
      compile(`https://elastic.co/{{${fn} value}}`, { value });

    expect(await compileUrl('trim', '  trim-me  ')).toMatchInlineSnapshot(
      `"https://elastic.co/trim-me"`
    );
    expect(await compileUrl('trimRight', '  trim-me  ')).toMatchInlineSnapshot(
      `"https://elastic.co/%20%20trim-me"`
    );
    expect(await compileUrl('trimLeft', '  trim-me  ')).toMatchInlineSnapshot(
      `"https://elastic.co/trim-me%20%20"`
    );
  });
  test('left,right,mid', async () => {
    const compileExpression = (expression: string, value: unknown) =>
      compile(`https://elastic.co/${expression}`, { value });

    expect(await compileExpression('{{left value 3}}', '12345')).toMatchInlineSnapshot(
      `"https://elastic.co/123"`
    );
    expect(await compileExpression('{{right value 3}}', '12345')).toMatchInlineSnapshot(
      `"https://elastic.co/345"`
    );
    expect(await compileExpression('{{mid value 1 3}}', '12345')).toMatchInlineSnapshot(
      `"https://elastic.co/234"`
    );
  });

  test('concat', async () => {
    expect(
      await compile(`https://elastic.co/{{concat value1 "," value2}}`, {
        value1: 'v1',
        value2: 'v2',
      })
    ).toMatchInlineSnapshot(`"https://elastic.co/v1,v2"`);

    expect(
      await compile(`https://elastic.co/{{concat valueArray}}`, { valueArray: ['1', '2', '3'] })
    ).toMatchInlineSnapshot(`"https://elastic.co/1,2,3"`);
  });

  test('split', async () => {
    expect(
      await compile(
        `https://elastic.co/{{lookup (split value ",") 0 }}&{{lookup (split value ",") 1 }}`,
        {
          value: '47.766201,-122.257057',
        }
      )
    ).toMatchInlineSnapshot(`"https://elastic.co/47.766201&-122.257057"`);

    await expect(() =>
      compile(`https://elastic.co/{{split value}}`, { value: '47.766201,-122.257057' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"[split] \\"splitter\\" expected to be a string"`
    );
  });
});
