/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { create as createHandlebars, HelperDelegate, HelperOptions } from 'handlebars';
import { encode, RisonValue } from 'rison-node';
import dateMath from '@kbn/datemath';
import moment, { Moment } from 'moment';
import numeral from '@elastic/numeral';
import { url } from '@kbn/kibana-utils-plugin/public';

const handlebars = createHandlebars();

function createSerializationHelper(
  fnName: string,
  serializeFn: (value: unknown) => string
): HelperDelegate {
  return (...args) => {
    const { hash } = args.slice(-1)[0] as HelperOptions;
    const hasHash = Object.keys(hash).length > 0;
    const hasValues = args.length > 1;
    if (hasHash && hasValues) {
      throw new Error(`[${fnName}]: both value list and hash are not supported`);
    }
    if (hasHash) {
      if (Object.values(hash).some((v) => typeof v === 'undefined'))
        throw new Error(`[${fnName}]: unknown variable`);
      return serializeFn(hash);
    } else {
      const values = args.slice(0, -1) as unknown[];
      if (values.some((value) => typeof value === 'undefined'))
        throw new Error(`[${fnName}]: unknown variable`);
      if (values.length === 0) throw new Error(`[${fnName}]: unknown variable`);
      if (values.length === 1) return serializeFn(values[0]);
      return serializeFn(values);
    }
  };
}

handlebars.registerHelper('json', createSerializationHelper('json', JSON.stringify));
handlebars.registerHelper(
  'rison',
  createSerializationHelper('rison', (v) => encode(v as RisonValue))
);

handlebars.registerHelper('date', (...args) => {
  const values = args.slice(0, -1) as [string | Date, string | undefined];
  // eslint-disable-next-line prefer-const
  let [date, format] = values;
  if (typeof date === 'undefined') throw new Error(`[date]: unknown variable`);
  let momentDate: Moment | undefined;
  if (typeof date === 'string') {
    momentDate = dateMath.parse(date);
    if (!momentDate || !momentDate.isValid()) {
      const ts = Number(date);
      if (!Number.isNaN(ts)) {
        momentDate = moment(ts);
      }
    }
  } else {
    momentDate = moment(date);
  }

  if (!momentDate || !momentDate.isValid()) {
    // do not throw error here, because it could be that in preview `__testValue__` is not parsable,
    // but in runtime it is
    return date;
  }
  return format ? momentDate.format(format) : momentDate.toISOString();
});

handlebars.registerHelper('formatNumber', (rawValue: unknown, pattern: string) => {
  if (!pattern || typeof pattern !== 'string')
    throw new Error(`[formatNumber]: pattern string is required`);
  const value = Number(rawValue);
  if (rawValue == null || Number.isNaN(value)) return rawValue;
  return numeral(value).format(pattern);
});

handlebars.registerHelper('lowercase', (rawValue: unknown) => String(rawValue).toLowerCase());
handlebars.registerHelper('uppercase', (rawValue: unknown) => String(rawValue).toUpperCase());
handlebars.registerHelper('trim', (rawValue: unknown) => String(rawValue).trim());
handlebars.registerHelper('trimLeft', (rawValue: unknown) => String(rawValue).trimLeft());
handlebars.registerHelper('trimRight', (rawValue: unknown) => String(rawValue).trimRight());
handlebars.registerHelper('left', (rawValue: unknown, numberOfChars: number) => {
  if (typeof numberOfChars !== 'number')
    throw new Error('[left]: expected "number of characters to extract" to be a number');
  return String(rawValue).slice(0, numberOfChars);
});
handlebars.registerHelper('right', (rawValue: unknown, numberOfChars: number) => {
  if (typeof numberOfChars !== 'number')
    throw new Error('[left]: expected "number of characters to extract" to be a number');
  return String(rawValue).slice(-numberOfChars);
});
handlebars.registerHelper('mid', (rawValue: unknown, start: number, length: number) => {
  if (typeof start !== 'number') throw new Error('[left]: expected "start" to be a number');
  if (typeof length !== 'number') throw new Error('[left]: expected "length" to be a number');
  return String(rawValue).substr(start, length);
});
handlebars.registerHelper('concat', (...args) => {
  const values = args.slice(0, -1) as unknown[];
  return values.join('');
});
handlebars.registerHelper('split', (...args) => {
  const [str, splitter] = args.slice(0, -1) as [string, string];
  if (typeof splitter !== 'string') throw new Error('[split] "splitter" expected to be a string');
  return String(str).split(splitter);
});
handlebars.registerHelper('replace', (...args) => {
  const [str, searchString, valueString] = args.slice(0, -1) as [string, string, string];
  if (typeof searchString !== 'string' || typeof valueString !== 'string')
    throw new Error(
      '[replace]: "searchString" and "valueString" parameters expected to be strings, but not a string or missing'
    );
  return String(str).split(searchString).join(valueString);
});

handlebars.registerHelper('encodeURIComponent', (component: unknown) => {
  const str = String(component);
  return encodeURIComponent(str);
});
handlebars.registerHelper('encodeURIQuery', (component: unknown) => {
  const str = String(component);
  return url.encodeUriQuery(str);
});

export { handlebars };
