/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface RestoreSettings {
  indices?: string[];
  ignoreUnavailable?: boolean;
  includeGlobalState?: boolean;
  renamePattern?: string;
  renameReplacement?: string;
  partial?: boolean;
  indexSettings?: { [key: string]: any };
  ignoreIndexSettings?: string[];
}
