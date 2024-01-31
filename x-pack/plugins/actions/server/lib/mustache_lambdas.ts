/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as tinymath from '@kbn/tinymath';
import { parse as hjsonParse } from 'hjson';
import moment from 'moment-timezone';
import { Logger } from '@kbn/core/server';

import { formatNumber } from './number_formatter';

type Variables = Record<string, unknown>;

const DefaultDateTimeZone = 'UTC';
const DefaultDateFormat = 'YYYY-MM-DD hh:mma';

export function getMustacheLambdas(logger: Logger): Variables {
  return getLambdas(logger);
}

const TimeZoneSet = new Set(moment.tz.names());

type RenderFn = (text: string) => string;

function getLambdas(logger: Logger) {
  return {
    EvalMath: () =>
      // mustache invokes lamdas with `this` set to the current "view" (variables)
      function (this: Variables, text: string, render: RenderFn) {
        return evalMath(this, render(text.trim()), logger);
      },
    ParseHjson: () =>
      function (text: string, render: RenderFn) {
        return parseHjson(render(text.trim()), logger);
      },
    FormatDate: () =>
      function (text: string, render: RenderFn) {
        const dateString = render(text.trim()).trim();
        return formatDate(dateString, logger);
      },
    FormatNumber: () =>
      function (text: string, render: RenderFn) {
        const numberString = render(text.trim()).trim();
        return formatNumber(logger, numberString);
      },
  };
}

function evalMath(vars: Variables, o: unknown, logger: Logger): string {
  const expr = `${o}`;
  try {
    const result = tinymath.evaluate(expr, vars);
    return `${result}`;
  } catch (err) {
    logger.error(
      `mustache render error: error evaluating tinymath expression "${expr}": ${err.message}`
    );
    return '';
  }
}

function parseHjson(o: unknown, logger: Logger): string {
  const hjsonObject = `${o}`;
  let object: unknown;

  try {
    object = hjsonParse(hjsonObject);
  } catch (err) {
    logger.error(`mustache render error: error parsing Hjson "${hjsonObject}": ${err.message}`);
    return '';
  }

  return JSON.stringify(object);
}

function formatDate(dateString: unknown, logger: Logger): string {
  const { date, timeZone, format } = splitDateString(`${dateString}`);

  if (date === '') {
    logger.error(`mustache render error: error parsing date - value is empty`);
    return '';
  }

  if (isNaN(new Date(date).valueOf())) {
    logger.error(`mustache render error: invalid date "${date}"`);
    return '';
  }

  let mDate: moment.Moment;
  try {
    mDate = moment(date);
    if (!mDate.isValid()) {
      logger.error(`mustache render error: invalid date "${date}"`);
      return '';
    }
  } catch (err) {
    logger.error(`mustache render error: error evaluating moment date "${date}": ${err.message}`);
    return '';
  }

  if (!TimeZoneSet.has(timeZone)) {
    logger.error(`mustache render error: unknown timeZone value "${timeZone}"`);
    return '';
  }

  try {
    mDate.tz(timeZone);
  } catch (err) {
    logger.error(
      `mustache render error: error evaluating moment timeZone "${timeZone}": ${err.message}`
    );
    return '';
  }

  try {
    return mDate.format(format);
  } catch (err) {
    logger.error(
      `mustache render error: error evaluating moment format "${format}": ${err.message}`
    );
    return '';
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
