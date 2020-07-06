/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow } from 'lodash';

export function escapeQuotes(str: string) {
  return str.replace(/"/g, '\\"');
}

export const escapeKuery = flow(escapeSpecialCharacters, escapeAndOr, escapeNot, escapeWhitespace);

// See the SpecialCharacter rule in kuery.peg
function escapeSpecialCharacters(str: string) {
  return str.replace(/[\\():<>"*]/g, '\\$&'); // $& means the whole matched string
}

// See the Keyword rule in kuery.peg
function escapeAndOr(str: string) {
  return str.replace(/(\s+)(and|or)(\s+)/gi, '$1\\$2$3');
}

function escapeNot(str: string) {
  return str.replace(/not(\s+)/gi, '\\$&');
}

// See the Space rule in kuery.peg
function escapeWhitespace(str: string) {
  return str.replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}
