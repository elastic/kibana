/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';

const DEFAULT_LOCALES = ['en-US'];

/**
 * Takes a string which contains a number and formatting options,
 * and returns that string formatted according to the options.
 * Intl.FormatNumber is used for formatting.
 *
 * The format is 'number; locales; options', where
 * - `number` is the number to format
 * - `locales` is a comma-separated list of locales
 * - `options` is a comma-separated list of Intl.NumberFormat options
 *
 * Both semicolons are required , but the `locales` and `options` can
 * be empty. If `locales` is empty, `en-US` is used, for consistency.
 *
 * Examples:
 *   `1234.567; en-US; style: currency, currency: USD`
 *   `1234.567;; style: currency, currency: USD`
 *   `1234.567;;`
 *
 * see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
 *
 * @param numberAndFormat string containing a number and formatting options
 * @returns number formatted according to the options
 */
export function formatNumber(logger: Logger, numberLocalesOptions: string): string {
  const [numString, localesString, optionsString] = splitNumberLocalesOptions(numberLocalesOptions);
  if (localesString === undefined || optionsString === undefined) {
    return logAndReturnErr(logger, `invalid format, missing semicolons: '${numberLocalesOptions}'`);
  }

  const num = parseFloat(numString);
  if (isNaN(num)) {
    return logAndReturnErr(logger, `invalid number: '${numString}'`);
  }

  const locales = getLocales(localesString);

  const [options, optionsError] = getOptions(optionsString);
  if (optionsError) {
    return logAndReturnErr(logger, `invalid options: ${optionsError}`);
  }

  try {
    return new Intl.NumberFormat(locales, options).format(num);
  } catch (err) {
    return logAndReturnErr(logger, `error formatting number: ${err.message}`);
  }
}

function getLocales(localesString: string): string[] {
  const locales = splitCommas(localesString)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (locales.length > 0) return locales;

  return DEFAULT_LOCALES;
}

type IntlNumberOptions = Record<string, string | number | boolean>;

function getOptions(optionsString: string): [IntlNumberOptions, string?] {
  const options: IntlNumberOptions = {};

  const keyVals = splitCommas(optionsString);

  for (const keyVal of keyVals) {
    if (keyVal === '') continue;

    const [key, valString] = splitKeyVal(keyVal);
    if (valString === undefined) {
      return [{}, `missing colon in option: '${keyVal}'`];
    }

    options[key] = getVal(valString);
  }

  return [options];
}

// Intl.NumberFormat options can be a string, number, or boolean
// There don't seem to be cases of needing to send a string version
// of a boolean or number.
function getVal(valString: string): string | number | boolean {
  const valAsNum = parseFloat(valString);
  if (!isNaN(valAsNum)) return valAsNum;

  if (valString === 'true') return true;
  if (valString === 'false') return false;

  return valString;
}

function splitCommas(str: string): string[] {
  return str.split(',').map((s) => s.trim());
}

function splitKeyVal(s: string): [string, string | undefined] {
  const [key, val] = s.split(':', 2);
  return [key.trim(), val?.trim()];
}

function splitNumberLocalesOptions(
  numberLocalesOptions: string
): [string, string | undefined, string | undefined] {
  const [num, locales, options] = numberLocalesOptions.split(';', 3);
  return [num.trim(), locales?.trim(), options?.trim()];
}

function logAndReturnErr(logger: Logger, errMessage: string): string {
  logger.warn(`mustache render error: ${errMessage}`);
  return errMessage;
}
