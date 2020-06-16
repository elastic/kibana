/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { create as createHandlebars } from 'handlebars';
import { encode } from 'rison-node';
import dateMath from '@elastic/datemath';
import moment from 'moment';

const handlebars = createHandlebars();

handlebars.registerHelper('json', (v) => {
  try {
    return JSON.stringify(v);
  } catch (e) {
    return v;
  }
});

handlebars.registerHelper('rison', (v) => {
  try {
    return encode(v);
  } catch (e) {
    return v;
  }
});

handlebars.registerHelper('date', (date: string | Date, format: string) => {
  const momentDate = typeof date === 'string' ? dateMath.parse(date) : moment(date);

  if (!momentDate || !momentDate.isValid()) {
    // eslint-disable-next-line no-console
    console.warn(`urlTemplate: Can\'t parse date string ${date}. Returning original string.`);
    return date;
  }

  return format
    ? (() => {
        try {
          return momentDate.format(format);
        } catch (e) {
          return momentDate.toISOString();
        }
      })()
    : momentDate.toISOString();
});

export function compile(url: string, context: object): string {
  try {
    const template = handlebars.compile(url);
    return template(context);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(e);
    return url;
  }
}
