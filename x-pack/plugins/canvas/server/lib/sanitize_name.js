/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function sanitizeName(name) {
  // blacklisted characters
  const blacklist = ['(', ')'];
  const pattern = blacklist.map((v) => escapeRegExp(v)).join('|');
  const regex = new RegExp(pattern, 'g');
  return name.replace(regex, '_');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
