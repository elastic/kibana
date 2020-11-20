/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';
import { isString, cloneDeepWith } from 'lodash';

type Escape = 'markdown' | 'slack' | 'json' | 'none';
type Variables = Record<string, unknown>;

// return a rendered mustache template given the specified variables and escape
export function renderMustacheString(string: string, variables: Variables, escape: Escape): string {
  const previousMustacheEscape = Mustache.escape;
  Mustache.escape = getEscape(escape);

  try {
    return Mustache.render(`${string}`, variables);
  } catch (err) {
    // log error; the mustache code does not currently leak variables
    return `error rendering mustache template "${string}": ${err.message}`;
  } finally {
    Mustache.escape = previousMustacheEscape;
  }
}

// return a cloned object with all strings rendered as mustache templates
export function renderMustacheObject<Params>(params: Params, variables: Variables): Params {
  const result = cloneDeepWith(params, (value: unknown) => {
    if (!isString(value)) return;

    // since we're rendering a JS object, no escaping needed
    return renderMustacheString(value, variables, 'none');
  });

  // The return type signature for `cloneDeep()` ends up taking the return
  // type signature for the customizer, but rather than pollute the customizer
  // with casts, seemed better to just do it in one place, here.
  return (result as unknown) as Params;
}

function getEscape(escape: Escape): (string: string) => string {
  if (escape === 'markdown') return escapeMarkdown;
  if (escape === 'slack') return escapeSlack;
  if (escape === 'json') return escapeJSON;
  return escapeNone;
}

function escapeNone(value: string): string {
  return value;
}

// replace with JSON stringified version, removing leading and trailing double quote
function escapeJSON(value: string): string {
  if (value == null) return '';

  const quoted = JSON.stringify(`${value}`);
  // quoted will always be a string with double quotes, but we don't want the double quotes
  return quoted.substr(1, quoted.length - 2);
}

// see: https://api.slack.com/reference/surfaces/formatting
// but in practice, a bit more needs to be escaped, in drastic ways
function escapeSlack(value: string): string {
  // if the value contains * or _, escape the whole thing with back tics
  if (value.includes('_') || value.includes('*')) {
    // replace unescapable back tics with single quote
    value = value.replace(/`/g, `'`);
    return '`' + value + '`';
  }

  // otherwise, do "standard" escaping
  value = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // this isn't really standard escaping, but escaping back tics is problematic
    .replace(/`/g, `'`);

  return value;
}

// see: https://www.markdownguide.org/basic-syntax/#characters-you-can-escape
function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}
