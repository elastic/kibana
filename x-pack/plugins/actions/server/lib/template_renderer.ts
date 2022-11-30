/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import moment from 'moment-timezone';
import Handlebars from '@kbn/handlebars';
import * as tinymath from '@kbn/tinymath';

import { Escape, getEscape } from './mustache_renderer';

type Variables = Record<string, unknown>;

interface TemplateDirectives {
  format: string; // mustache or handlebars
  timeZone?: string; // https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  dateFormat?: string; // https://momentjs.com/docs/#/displaying/format/
  expressions: string[]; // kibana expressions
}

export function renderTemplate(
  originalTemplate: string,
  variables: Variables,
  escape: Escape
): string {
  const { template, directives } = getTemplateDirectives(originalTemplate);
  // presumably we'll default to mustache, but trying defaulting to handlebars
  const format = directives.format;

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
      const timeZone = directives.timeZone;
      const dateFormat = directives.dateFormat;

      const handlebars = Handlebars.create();

      handlebars.registerHelper('date', function (this: Variables, o: unknown) {
        return formatDate(o, this, timeZone, dateFormat);
      });
      handlebars.registerHelper('json', function (this: Variables, o: unknown) {
        return jsonize(o, this, false);
      });
      handlebars.registerHelper('jsonl', function (this: Variables, o: unknown) {
        return jsonize(o, this, true);
      });
      handlebars.registerHelper('math', function (this: Variables, o: unknown) {
        return math(o, this);
      });

      // see: https://github.com/handlebars-lang/handlebars.js/pull/1523
      // and issues linked to it, for a better approach to customizing
      // escaping functions
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

interface GetTemplateDirectives {
  template: string;
  directives: TemplateDirectives;
}

// match lines like {{!@ ... }}
const commentPattern = /^\s*\{\{\!@(.*)\}\}\s*$/;

// match lines like foo : bar car
const propertyPattern = /^\s*(\w+)\s*:\s*(.*)\s*$/;

function getTemplateDirectives(template: string): GetTemplateDirectives {
  const lines = template.split('\n');
  const templateLines: string[] = [];
  const directives: TemplateDirectives = {
    format: 'mustache',
    expressions: [],
  };

  // just trying this as default "for fun", but presumably we'd ship
  // mustache as the default, like a few lines ^^^
  directives.format = 'mustache';

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

    switch (key) {
      case 'format':
        directives.format = val;
        break;
      case 'timeZone':
        directives.timeZone = val;
        break;
      case 'dateFormat':
        directives.dateFormat = val;
        break;
      case 'expr':
        directives.expressions.push(val);
        break;
    }
  }

  const result = {
    template: templateLines.join('\n'),
    directives,
  };

  return result;
}

const DefaultFormat = 'YYYY-MM-DD hh:mma';

function formatDate(
  o: unknown,
  vars: Variables,
  timeZone: string = 'UTC',
  format?: string
): string {
  const mDate = moment(`${o}`);
  if (timeZone) {
    mDate.tz(timeZone);
  }
  return mDate.format(format ?? DefaultFormat);
}

function jsonize(o: unknown, vars: Variables, pretty: boolean): string {
  if (pretty) {
    return JSON.stringify(o, null, 4);
  } else {
    return JSON.stringify(o);
  }
}

function math(o: unknown, vars: Variables): string {
  const expr = `${o}`;
  try {
    const result = tinymath.evaluate(expr, vars);
    return `${result}`;
  } catch (err) {
    throw new Error(`error evaluating tinymath expression "${expr}": ${err.message}`);
  }
}
