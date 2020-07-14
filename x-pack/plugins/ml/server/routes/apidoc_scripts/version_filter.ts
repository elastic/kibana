/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Block } from './types';

const API_VERSION = '7.8.0';

/**
 * Post Filter parsed results.
 * Updates api version of the endpoints.
 */
export function postFilter(parsedFiles: any[]) {
  parsedFiles.forEach((parsedFile) => {
    parsedFile.forEach((block: Block) => {
      block.local.version = API_VERSION;
    });
  });
}
