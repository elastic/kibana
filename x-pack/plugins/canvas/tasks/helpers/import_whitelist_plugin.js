/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { relative, resolve } from 'path';

import isPathInside from 'is-path-inside';
import chalk from 'chalk';

const KIBANA_ROOT = resolve(__dirname, '../../../../..');

function matchesSomeCondition(pathsOrRegexps, path) {
  return pathsOrRegexps.some(pathOrRegexp => {
    if (pathOrRegexp instanceof RegExp) return pathOrRegexp.test(path);
    return path === pathOrRegexp || isPathInside(path, pathOrRegexp);
  });
}

export class ImportWhitelistPlugin {
  constructor({ from, whitelist }) {
    this.from = from;
    this.whitelist = whitelist;
  }

  apply(resolver) {
    resolver.hooks.file.tap('ImportWhitelistPlugin', request => {
      if (!request.context || !request.context.issuer) {
        // ignore internal requests that don't have an issuer
        return;
      }

      if (!matchesSomeCondition([this.from], request.context.issuer)) {
        // request is not filtered by this whitelist unless it comes
        // from a module matching the from conditions
        return;
      }

      if (!matchesSomeCondition(this.whitelist, request.path)) {
        throw new Error(
          `Attempted to import "${chalk.yellow(relative(KIBANA_ROOT, request.path))}" which ` +
            `is not in the whitelist for the ${chalk.cyan(relative(KIBANA_ROOT, this.from))} ` +
            `directory.`
        );
      }
    });
  }
}
