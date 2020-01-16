/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// see: https://en.wikipedia.org/wiki/Unicode_control_characters
// but don't include tabs (0x09), they're fine
const CONTROL_CHAR_PATTERN = /[\x00-\x08]|[\x0A-\x1F]|[\x7F-\x9F]|[\u2028-\u2029]/g;

// replaces control characters in string with ;, but leaves tabs
export function withoutControlCharacters(s: string): string {
  return s.replace(CONTROL_CHAR_PATTERN, ';');
}
