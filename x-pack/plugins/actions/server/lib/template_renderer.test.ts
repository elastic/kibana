/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderMustacheString } from './mustache_renderer';

describe('using handlebars', () => {
  it('is supported with a format comment directive', async () => {
    const template = `
{{!@ format: handlebars}}
{{#if x}}{{x}}{{/if}}
    `.trim();

    expect(await renderMustacheString(template, { x: 1 }, 'none')).toEqual('1');
  });

  it('has a date helper', async () => {
    const timeStamp = '2022-11-29T15:52:44Z';
    const template = `
{{!@ format: handlebars}}
{{date timeStamp}}
    `.trim();

    expect(await renderMustacheString(template, { timeStamp }, 'none')).toEqual(
      '2022-11-29 03:52pm'
    );
  });

  it('date with a time zone is successful', async () => {
    const timeStamp = '2022-11-29T15:52:44Z';
    const timeZone = 'America/New_York';
    const template = `
{{!@ format: handlebars}}
{{!@ timeZone: ${timeZone}}}
{{date timeStamp}}
    `.trim();

    expect(await renderMustacheString(template, { timeStamp }, 'none')).toEqual(
      '2022-11-29 10:52am'
    );
  });

  it('date with a format is successful', async () => {
    const timeStamp = '2022-11-29T15:52:44Z';
    const dateFormat = 'dddd MMM Do YYYY HH:mm:ss.SSS';
    const template = `
{{!@ format: handlebars}}
{{!@ dateFormat: ${dateFormat}}}
{{date timeStamp}}
    `.trim();

    expect(await renderMustacheString(template, { timeStamp }, 'none')).toEqual(
      'Tuesday Nov 29th 2022 15:52:44.000'
    );
  });

  it('date with a format and timezone is successful', async () => {
    const timeStamp = '2022-11-29T15:52:44Z';
    const dateFormat = 'dddd MMM Do YYYY HH:mm:ss.SSS';
    const timeZone = 'America/New_York';
    const template = `
{{!@ format: handlebars}}
{{!@ dateFormat: ${dateFormat}}}
{{!@ timeZone: ${timeZone}}}
{{date timeStamp}}
  `.trim();

    expect(await renderMustacheString(template, { timeStamp }, 'none')).toEqual(
      'Tuesday Nov 29th 2022 10:52:44.000'
    );
  });

  it('json is successful', async () => {
    const vars = {
      context: {
        a: {
          b: 1,
        },
        c: {
          d: 2,
        },
      },
    };
    const template = `
{{!@ format: handlebars}}
{{json context}}
  `.trim();

    expect(await renderMustacheString(template, vars, 'none')).toEqual('{"a":{"b":1},"c":{"d":2}}');
  });

  it('json with arrays works', async () => {
    const vars = {
      context: {
        arr: [17, 42],
      },
    };
    const template = `
{{!@ format: handlebars}}
{{json context.arr}}
  `.trim();

    expect(await renderMustacheString(template, vars, 'none')).toEqual('[17,42]');

    // arrays to JSON doesn't work with mustache due to legacy toString
    // support in the JS arrays
    const template2 = `
{{!@ format: mustache}}
{{context.arr}}
      `.trim();

    expect(await renderMustacheString(template2, vars, 'none')).toEqual('17,42');
  });

  it('jsonl is successful', async () => {
    const vars = {
      context: {
        a: {
          b: 1,
        },
        c: {
          d: 2,
        },
      },
    };
    const template = `
{{!@ format: handlebars}}
{{jsonl context}}
  `.trim();

    expect(await renderMustacheString(template, vars, 'none')).toEqual(`{
    "a": {
        "b": 1
    },
    "c": {
        "d": 2
    }
}`);
  });

  it('math is successful', async () => {
    const vars = {
      context: {
        a: { b: 1 },
        c: { d: 2 },
      },
    };
    const template = `
{{!@ format: handlebars}}
{{math '1 + 0'}}
{{math '1 + context.a.b'}}
{{#context}}
{{math '1 + c.d'}}
{{/context}}
    `.trim();

    const result = await renderMustacheString(template, vars, 'none');
    expect(result).toEqual(`1\n2\n3\n`);
  });
});
