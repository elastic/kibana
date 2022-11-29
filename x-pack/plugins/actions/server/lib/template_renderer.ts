/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import Handlebars from '@kbn/handlebars';
import moment from 'moment-timezone';

import { Escape, getEscape } from './mustache_renderer';

type Variables = Record<string, unknown>;

export function renderTemplate(
  originalTemplate: string,
  variables: Variables,
  escape: Escape
): string {
  const { template, properties } = getPropertiesFromTemplate(originalTemplate);
  // presumably we'll default to mustache, but trying defaulting to handlebars
  const format = properties.get('format') || 'handlebars';

  switch (format) {
    case 'mustache':
      const previousMustacheEscape = Mustache.escape;
      Mustache.escape = getEscape(escape);
      try {
        return Mustache.render(template, variables);
      } finally {
        Mustache.escape = previousMustacheEscape;
      }

    case 'handlebars':
      // list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
      const timeZone = properties.get('timeZone');
      // list: https://momentjs.com/docs/#/displaying/format/
      const dateFormat = properties.get('dateFormat');

      const handlebars = Handlebars.create();
      handlebars.registerHelper('date', (s: string) => formatDate(s, timeZone, dateFormat));
      const previousHandlebarsEscape = handlebars.Utils.escapeExpression;
      handlebars.Utils.escapeExpression = getEscape(escape);
      try {
        return handlebars.compile(template)(variables);
      } finally {
        handlebars.Utils.escapeExpression = previousHandlebarsEscape;
      }

    default:
      throw new Error(`unknown format specified for template: ${format}`);
  }
}

interface GetPropertiesFromTemplate {
  template: string;
  properties: Map<string, string>;
}

// match lines like {{!@ ... }}
const commentPattern = /^\s*\{\{\!@(.*)\}\}\s*$/;

// match lines like foo : bar car
const propertyPattern = /^\s*(\w+)\s*:\s*(.*)\s*$/;

function getPropertiesFromTemplate(template: string): GetPropertiesFromTemplate {
  const lines = template.split('\n');
  const templateLines: string[] = [];
  const properties = new Map<string, string>();

  for (const line of lines) {
    const match = line.match(commentPattern);
    if (match == null) {
      templateLines.push(line);
      continue;
    }

    const comment = match[1];
    const propMatch = comment.match(propertyPattern);
    if (propMatch == null) {
      continue; // should log a warning
    }
    const [_, key, val] = propMatch;
    properties.set(key, val);
  }

  const result = {
    template: templateLines.join('\n'),
    properties,
  };

  return result;
}

const DefaultFormat = 'YYYY-MM-DD hh:mma';

function formatDate(date: string, timeZone: string = 'UTC', format?: string): string {
  const mDate = moment(date);
  if (timeZone) {
    mDate.tz(timeZone);
  }
  return mDate.format(format ?? DefaultFormat);
}
