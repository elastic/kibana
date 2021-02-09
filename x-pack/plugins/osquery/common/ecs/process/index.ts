/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ProcessEcs {
  entity_id?: string[];
  hash?: ProcessHashData;
  pid?: number[];
  name?: string[];
  ppid?: number[];
  args?: string[];
  executable?: string[];
  title?: string[];
  thread?: Thread;
  working_directory?: string[];
}

export interface ProcessHashData {
  md5?: string[];
  sha1?: string[];
  sha256?: string[];
}

export interface Thread {
  id?: number[];
  start?: string[];
}
