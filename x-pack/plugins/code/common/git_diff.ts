/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CommitInfo } from '../model/commit';

export interface Diff {
  additions: number;
  deletions: number;
  files: FileDiff[];
}

export interface CommitDiff extends Diff {
  commit: CommitInfo;
}

export interface FileDiff {
  path: string;
  originPath?: string;
  kind: DiffKind;
  originCode?: string;
  modifiedCode?: string;
  language?: string;
  additions: number;
  deletions: number;
}

export enum DiffKind {
  ADDED = 'ADDED',
  DELETED = 'DELETED',
  MODIFIED = 'MODIFIED',
  RENAMED = 'RENAMED',
}
