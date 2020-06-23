/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import extractZip from 'extract-zip';
import { ExtractError } from './extract_error';

export function unzip(filepath, target) {
  return new Promise(function (resolve, reject) {
    extractZip(filepath, { dir: target }, (err) => {
      if (err) {
        return reject(new ExtractError(err));
      }

      resolve();
    });
  });
}
