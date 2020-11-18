/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import extractZip from 'extract-zip';
import { ExtractError } from './extract_error';

export async function unzip(filepath, target) {
  try {
    await extractZip(filepath, { dir: target });
  } catch (err) {
    throw new ExtractError(err);
  }
}
