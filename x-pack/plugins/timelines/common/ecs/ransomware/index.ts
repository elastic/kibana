/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Ransomware {
  feature?: string[];
  score?: string[];
  version?: number[];
  child_pids?: string[];
  files?: RansomwareFiles;
}

export interface RansomwareFiles {
  operation?: string[];
  entropy?: number[];
  metrics?: string[];
  extension?: string[];
  original?: OriginalRansomwareFiles;
  path?: string[];
  data?: string[];
  score?: number[];
}

export interface OriginalRansomwareFiles {
  path?: string[];
  extension?: string[];
}
