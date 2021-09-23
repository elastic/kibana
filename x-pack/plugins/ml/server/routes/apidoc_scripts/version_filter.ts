/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Block } from './types';

const API_VERSION = '7.15.0';

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
