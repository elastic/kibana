/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import extractZip from 'extract-zip';
import { ExtractError } from './extract_error';

export async function unzip(filepath: string, target: string) {
  try {
    await extractZip(filepath, { dir: target });
  } catch (err) {
    throw new ExtractError(err);
  }
}
