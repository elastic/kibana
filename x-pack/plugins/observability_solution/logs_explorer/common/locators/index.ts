/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogExplorerLocator } from './log_explorer/log_explorer_locator';

export * from './log_explorer';

export interface LogExplorerLocators {
  logExplorerLocator: LogExplorerLocator;
}
