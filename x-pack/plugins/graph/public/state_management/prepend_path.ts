/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';
import { format, parse } from 'url';

/**
 *
 * @param {string} relativePath - a relative path that must start with a "/".
 * @param {string} newPath - the new path to prefix. ex: 'xyz'
 * @return {string} the url with the basePath prepended. ex. '/xyz/app/kibana#/management'. If
 * the relative path isn't in the right format (e.g. doesn't start with a "/") the relativePath is returned
 * unchanged.
 */
export function prependPath(relativePath: string, newPath = '') {
  if (!relativePath || !isString(relativePath)) {
    return relativePath;
  }

  const parsed = parse(relativePath, true, true);
  if (!parsed.host && parsed.pathname) {
    if (parsed.pathname[0] === '/') {
      parsed.pathname = newPath + parsed.pathname;
    }
  }

  return format({
    protocol: parsed.protocol,
    host: parsed.host,
    pathname: parsed.pathname,
    query: parsed.query,
    hash: parsed.hash,
  });
}
