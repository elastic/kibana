/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import { isPlainObject, cloneDeep, merge } from 'lodash';

import { renderTemplate } from './template_renderer';

export type Escape = 'markdown' | 'slack' | 'json' | 'none';
type Variables = Record<string, unknown>;

// return a rendered mustache template with no escape given the specified variables and escape
// Individual variable values should be stringified already
export async function renderMustacheStringNoEscape(
  string: string,
  variables: Variables
): Promise<string> {
  try {
    return Mustache.render(`${string}`, variables);
  } catch (err) {
    // log error; the mustache code does not currently leak variables
    return `error rendering mustache template "${string}": ${err.message}`;
  }
}

// return a rendered mustache template given the specified variables and escape
export async function renderMustacheString(
  string: string,
  variables: Variables,
  escape: Escape
): Promise<string> {
  const augmentedVariables = augmentObjectVariables(variables);

  try {
    return renderTemplate(`${string}`, augmentedVariables, escape);
  } catch (err) {
    // log error; the mustache code does not currently leak variables
    return `error rendering mustache template "${string}": ${err.message}`;
  }
}

// return a cloned object with all strings rendered as mustache templates
export async function renderMustacheObject<Params>(
  params: Params,
  variables: Variables
): Promise<Params> {
  const augmentedVariables = augmentObjectVariables(variables);
  const result = await renderStringTemplates(cloneDeep(params), augmentedVariables);

  // The return type signature for `cloneDeep()` ends up taking the return
  // type signature for the customizer, but rather than pollute the customizer
  // with casts, seemed better to just do it in one place, here.
  return result as unknown as Params;
}

async function renderStringTemplates(object: unknown, variables: Variables): Promise<unknown> {
  if (object == null) return object;

  if (Array.isArray(object)) {
    for (let i = 0; i < object.length; i++) {
      object[i] = await renderStringTemplates(object[i], variables);
    }
    return object;
  }

  if (typeof object === 'object') {
    // @ts-ignore
    const record: Record<string, unknown> = object;
    for (const key of Object.keys(record)) {
      record[key] = await renderStringTemplates(record[key], variables);
    }
    return object;
  }

  if (typeof object === 'string') {
    return await renderMustacheString(object, variables, 'none');
  }

  return object;
}

// return variables cloned, with a toString() added to objects
function augmentObjectVariables(variables: Variables): Variables {
  const result = JSON.parse(JSON.stringify(variables));
  // convert variables with '.' in the name to objects
  convertDotVariables(result);
  addToStringDeep(result);
  return result;
}

function convertDotVariables(variables: Variables) {
  Object.keys(variables).forEach((key) => {
    if (key.includes('.')) {
      const obj = buildObject(key, variables[key]);
      variables = merge(variables, obj);
    }
    if (typeof variables[key] === 'object' && variables[key] != null) {
      convertDotVariables(variables[key] as Variables);
    }
  });
}

function buildObject(key: string, value: unknown) {
  const newObject: Variables = {};
  let tempObject = newObject;
  const splits = key.split('.');
  const length = splits.length - 1;
  splits.forEach((k, index) => {
    tempObject[k] = index === length ? value : ({} as unknown);
    tempObject = tempObject[k] as Variables;
  });
  return newObject;
}

function addToStringDeep(object: unknown): void {
  // for objects, add a toString method, and then walk
  if (isNonNullObject(object)) {
    if (!object.hasOwnProperty('toString')) {
      object.toString = () => JSON.stringify(object);
    }
    Object.values(object).forEach((value) => addToStringDeep(value));
  }

  // walk arrays, but don't add a toString() as mustache already does something
  if (Array.isArray(object)) {
    object.forEach((element) => addToStringDeep(element));
    return;
  }
}

function isNonNullObject(object: unknown): object is Record<string, unknown> {
  if (object == null) return false;
  if (typeof object !== 'object') return false;
  if (!isPlainObject(object)) return false;
  return true;
}

export function getEscape(escape: Escape): (value: unknown) => string {
  if (escape === 'markdown') return escapeMarkdown;
  if (escape === 'slack') return escapeSlack;
  if (escape === 'json') return escapeJSON;
  return escapeNone;
}

function escapeNone(value: unknown): string {
  if (value == null) return '';
  return `${value}`;
}

// replace with JSON stringified version, removing leading and trailing double quote
function escapeJSON(value: unknown): string {
  if (value == null) return '';

  const quoted = JSON.stringify(`${value}`);
  // quoted will always be a string with double quotes, but we don't want the double quotes
  return quoted.substr(1, quoted.length - 2);
}

// see: https://api.slack.com/reference/surfaces/formatting
// but in practice, a bit more needs to be escaped, in drastic ways
function escapeSlack(value: unknown): string {
  if (value == null) return '';

  const valueString = `${value}`;
  // if the value contains * or _, escape the whole thing with back tics
  if (valueString.includes('_') || valueString.includes('*')) {
    // replace unescapable back tics with single quote
    return '`' + valueString.replace(/`/g, `'`) + '`';
  }

  // otherwise, do "standard" escaping
  return (
    valueString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // this isn't really standard escaping, but escaping back tics is problematic
      .replace(/`/g, `'`)
  );
}

// see: https://www.markdownguide.org/basic-syntax/#characters-you-can-escape
function escapeMarkdown(value: unknown): string {
  if (value == null) return '';

  return `${value}`
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
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
