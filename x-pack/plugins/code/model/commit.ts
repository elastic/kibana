/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CommitInfo {
  updated: Date;
  message: string;
  committer: string;
  id: string;
  parents: string[];
}

export interface ReferenceInfo {
  name: string;
  reference: string;
  commit: CommitInfo;
  type: ReferenceType;
}

export enum ReferenceType {
  BRANCH,
  TAG,
  REMOTE_BRANCH,
  OTHER,
}
