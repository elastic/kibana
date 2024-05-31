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
    return logAndReturnErr(
      logger,
      `error evaluating tinymath expression "${expr}": ${err.message}`
    );
  }
}

function parseHjson(o: unknown, logger: Logger): string {
  const hjsonObject = `${o}`;
  let object: unknown;

  try {
    object = hjsonParse(hjsonObject);
  } catch (err) {
    return logAndReturnErr(logger, `error parsing Hjson "${hjsonObject}": ${err.message}`);
  }

  return JSON.stringify(object);
}

function formatDate(dateString: unknown, logger: Logger): string {
  const { date, timeZone, format } = splitDateString(`${dateString}`);

  if (date === '') {
    return logAndReturnErr(logger, `date is empty`);
  }

  if (isNaN(new Date(date).valueOf())) {
    return logAndReturnErr(logger, `invalid date "${date}"`);
  }

  let mDate: moment.Moment;
  try {
    mDate = moment(date);
    if (!mDate.isValid()) {
      return logAndReturnErr(logger, `invalid date "${date}"`);
    }
  } catch (err) {
    return logAndReturnErr(logger, `error evaluating moment date "${date}": ${err.message}`);
  }

  if (!TimeZoneSet.has(timeZone)) {
    return logAndReturnErr(logger, `unknown timeZone value "${timeZone}"`);
  }

  try {
    mDate.tz(timeZone);
  } catch (err) {
    return logAndReturnErr(
      logger,
      `error evaluating moment timeZone "${timeZone}": ${err.message}`
    );
  }

  try {
    return mDate.format(format);
  } catch (err) {
    return logAndReturnErr(logger, `error evaluating moment format "${format}": ${err.message}`);
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

function logAndReturnErr(logger: Logger, errMessage: string): string {
  logger.warn(`mustache render error: ${errMessage}`);
  return errMessage;
}
