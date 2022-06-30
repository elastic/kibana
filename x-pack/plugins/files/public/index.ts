/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilesPlugin } from './plugin';

export type { FilesClient, FilesClientFactory } from './types';

export function plugin() {
  return new FilesPlugin();
}
