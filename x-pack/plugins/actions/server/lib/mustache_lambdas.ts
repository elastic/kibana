/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as tinymath from '@kbn/tinymath';
import { parse as hjsonParse } from 'hjson';

import moment from 'moment-timezone';

type Variables = Record<string, unknown>;

const DefaultDateTimeZone = 'UTC';
const DefaultDateFormat = 'YYYY-MM-DD hh:mma';

export function getMustacheLambdas(): Variables {
  return getLambdas();
}

const TimeZoneSet = new Set(moment.tz.names());

type RenderFn = (text: string) => string;

function getLambdas() {
  return {
    EvalMath: () =>
      // mustache invokes lamdas with `this` set to the current "view" (variables)
      function (this: Variables, text: string, render: RenderFn) {
        return evalMath(this, render(text.trim()));
      },
    ParseHjson: () =>
      function (text: string, render: RenderFn) {
        return parseHjson(render(text.trim()));
      },
    FormatDate: () =>
      function (text: string, render: RenderFn) {
        const dateString = render(text.trim()).trim();
        return formatDate(dateString);
      },
  };
}

function evalMath(vars: Variables, o: unknown): string {
  const expr = `${o}`;
  try {
    const result = tinymath.evaluate(expr, vars);
    return `${result}`;
  } catch (err) {
    throw new Error(`error evaluating tinymath expression "${expr}": ${err.message}`);
  }
}

function parseHjson(o: unknown): string {
  const hjsonObject = `${o}`;
  let object: unknown;

  try {
    object = hjsonParse(hjsonObject);
  } catch (err) {
    throw new Error(`error parsing Hjson "${hjsonObject}": ${err.message}`);
  }

  return JSON.stringify(object);
}

function formatDate(dateString: unknown): string {
  const { date, timeZone, format } = splitDateString(`${dateString}`);

  if (date === '') {
    throw new Error(`date is empty`);
  }

  if (isNaN(new Date(date).valueOf())) {
    throw new Error(`invalid date "${date}"`);
  }

  let mDate: moment.Moment;
  try {
    mDate = moment(date);
    if (!mDate.isValid()) {
      throw new Error(`date is invalid`);
    }
  } catch (err) {
    throw new Error(`error evaluating moment date "${date}": ${err.message}`);
  }

  if (!TimeZoneSet.has(timeZone)) {
    throw new Error(`unknown timeZone value "${timeZone}"`);
  }

  try {
    mDate.tz(timeZone);
  } catch (err) {
    throw new Error(`error evaluating moment timeZone "${timeZone}": ${err.message}`);
  }

  try {
    return mDate.format(format);
  } catch (err) {
    throw new Error(`error evaluating moment format "${format}": ${err.message}`);
  }
}

function splitDateString(dateString: string) {
  const parts = dateString.split(';', 3).map((s) => s.trim());
  const [date = '', timeZone = '', format = ''] = parts;
  return {
    date,
    timeZone: timeZone || DefaultDateTimeZone,
    format: format || DefaultDateFormat,
  };
}
