/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

// Mustache supplies this function to render the template text inline
type MustacheRender = (text: string) => string;

// the part of Mustache's Context supplied during lambda evaluation as `this`
// see: Context in https://github.com/janl/mustache.js/blob/master/mustache.js
type MustacheContext = Record<string, unknown>;

export function getMustacheLambdas() {
  return {
    Trim: () => Trim,
    Date: () => DateFn,
    JSON: () => JSONFn,
    Expr: () => Expr,
  };
}

// The syntax with `this:` declares what type `this` is for the function!
function Trim(this: MustacheContext, text: string, render: MustacheRender): string {
  const rendered = renderAndCatch('Trim', text, render);
  return rendered.trim();
}

function DateFn(this: MustacheContext, text: string, render: MustacheRender): string {
  const fn = 'Date';
  let rendered: string;

  try {
    rendered = renderAndThrow(fn, text, render).trim();
  } catch (err) {
    return err.message;
  }

  const now = new Date().toISOString();
  const [date = now, zone = 'utc', ...formatArgs] = rendered.split(/\s+/g);

  if (moment.tz.zone(`${zone}`) === null) {
    return errorMessage(fn, text, `invalid timezone "${zone}"`);
  }

  // if format isn't supplied (empty string), use undefined as the value
  const format = formatArgs.join(' ').trim() || undefined;

  // check date before checking moment, since it has noisy errors
  let dateParsed: number;
  try {
    dateParsed = Date.parse(date);
  } catch (err) {
    return errorMessage(fn, text, `error parsing date "${date}": ${err.message}`);
  }

  if (isNaN(dateParsed)) {
    return errorMessage(fn, text, `error with date "${date}": unable to parse`);
  }

  try {
    return moment(date).tz(zone).format(format);
  } catch (err) {
    return errorMessage(fn, text, `error from moment: ${err.message}`);
  }
}

function JSONFn(this: MustacheContext, text: string, render: MustacheRender): string {
  const fn = 'JSON';
  const object = this[text.trim()] || 'undefined';

  try {
    return JSON.stringify(object);
  } catch (err) {
    return errorMessage(fn, text, `error serializing object: ${err.message}`);
  }
}

// Kibana Expressions
function Expr(this: MustacheContext, text: string, render: MustacheRender): string {
  const fn = 'Expr';
  return errorMessage(
    fn,
    text,
    `under construction; would have executed the text as a Kibana expression!`
  );
}

function renderAndCatch(fn: string, text: string, render: MustacheRender): string {
  try {
    return render(text);
  } catch (err) {
    return errorMessage(fn, text, err.message);
  }
}

function renderAndThrow(fn: string, text: string, render: MustacheRender): string {
  try {
    return render(text);
  } catch (err) {
    throw new Error(errorMessage(fn, text, err.message));
  }
}

function errorMessage(fn: string, text: string, message: string) {
  return `error rendering {{#${fn}}} "${text}" {{/${fn}}}: ${message}`;
}
