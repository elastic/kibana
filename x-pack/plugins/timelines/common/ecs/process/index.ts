/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ext } from '../file';

export interface ProcessEcs {
  Ext?: Ext;
  entity_id?: string[];
  entry_leader?: ProcessSessionData;
  session_leader?: ProcessSessionData;
  group_leader?: ProcessSessionData;
  exit_code?: number[];
  hash?: ProcessHashData;
  parent?: ProcessParentData;
  pid?: number[];
  name?: string[];
  ppid?: number[];
  args?: string[];
  executable?: string[];
  title?: string[];
  thread?: Thread;
  start?: string[];
  working_directory?: string[];
}

export interface ProcessSessionData {
  entity_id?: string[];
  pid?: string[];
  name?: string[];
}

export interface ProcessHashData {
  md5?: string[];
  sha1?: string[];
  sha256?: string[];
}

export interface ProcessParentData {
  name?: string[];
  pid?: number[];
}

export interface Thread {
  id?: number[];
  start?: string[];
}
