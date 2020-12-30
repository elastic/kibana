/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'tinymath';
import { unquoteString } from '../../../../common/lib/unquote_string';

// break out into separate function, write unit tests first
export function getFormObject(argValue) {
  if (argValue === '') {
    return {
      fn: '',
      column: '',
    };
  }

  // check if the value is a math expression, and set its type if it is
  const mathObj = parse(argValue);
  // A symbol node is a plain string, so we guess that they're looking for a column.
  if (typeof mathObj === 'string') {
    return {
      fn: '',
      column: unquoteString(argValue),
    };
  }

  // Check if its a simple function, eg a function wrapping a symbol node
  // check for only one arg of type string
  if (
    typeof mathObj === 'object' &&
    mathObj.args.length === 1 &&
    typeof mathObj.args[0] === 'string'
  ) {
    return {
      fn: mathObj.name,
      column: unquoteString(mathObj.args[0]),
    };
  }

  // Screw it, textarea for you my fancy.
  throw new Error(`Cannot render scalar values or complex math expressions`);
}
