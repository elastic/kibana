/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Original {
  name?: string[];
  path?: string[];
}

export interface CodeSignature {
  subject_name: string[];
  trusted: string[];
}
export interface Ext {
  code_signature?: CodeSignature[] | CodeSignature;
  original?: Original;
}
export interface Hash {
  md5?: string[];
  sha1?: string[];
  sha256: string[];
}

export interface FileEcs {
  name?: string[];

  path?: string[];

  target_path?: string[];

  extension?: string[];

  Ext?: Ext;

  type?: string[];

  device?: string[];

  inode?: string[];

  uid?: string[];

  owner?: string[];

  gid?: string[];

  group?: string[];

  mode?: string[];

  size?: number[];

  mtime?: string[];

  ctime?: string[];

  hash?: Hash;
}
