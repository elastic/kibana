/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { create as createHandlebars, HelperDelegate, HelperOptions } from 'handlebars';
import { encode, RisonValue } from 'rison-node';
import dateMath from '@elastic/datemath';
import moment, { Moment } from 'moment';

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

export function compile(url: string, context: object): string {
  const template = handlebars.compile(url, { strict: true, noEscape: true });
  return encodeURI(template(context));
}
