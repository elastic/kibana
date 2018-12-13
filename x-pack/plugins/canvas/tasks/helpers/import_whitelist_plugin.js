/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { relative, resolve } from 'path';

import isPathInside from 'is-path-inside';
import chalk from 'chalk';

const KIBANA_ROOT = resolve(__dirname, '../../../../..');

export class ImportWhitelistPlugin {
  constructor({ whitelist }) {
    this.whitelist = whitelist;
  }

  apply(resolver) {
    resolver.hooks.file.tap('ImportWhitelistPlugin', request => {
      const isAllowed = this.whitelist.some(pathOrRegexp => {
        if (pathOrRegexp instanceof RegExp) return pathOrRegexp.test(request.path);
        return request.path === pathOrRegexp || isPathInside(request.path, pathOrRegexp);
      });

      if (!isAllowed) {
        throw new Error(
          `Attempted to import "${chalk.cyan(relative(KIBANA_ROOT, request.path))}". ` +
            `Only node_modules and packages can be imported from outside of the "canvas_plugin_src" directory.`
        );
      }
    });
  }
}
