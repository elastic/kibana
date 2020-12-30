/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function truncate(text: string, length: number) {
  return `${text.substring(0, length)}…`;
}

export function truncateBeginning(text: string, length: number) {
  return `…${text.substring(text.length - length)}`;
}
