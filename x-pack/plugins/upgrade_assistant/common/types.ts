/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectAttributes,
} from 'src/server/saved_objects/service/saved_objects_client';

export enum ReindexStep {
  created,
  readonly,
  newIndexCreated,
  reindexStarted,
  reindexCompleted,
  aliasCreated,
}

export enum ReindexStatus {
  inProgress,
  completed,
  failed,
}

export const REINDEX_OP_TYPE = 'upgrade-assistant-reindex-operation';
export interface ReindexOperation extends SavedObjectAttributes {
  indexName: string;
  newIndexName: string;
  status: ReindexStatus;
  lastCompletedStep: ReindexStep;
  locked: string | null;
  reindexTaskId: string | null;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
}

export type ReindexSavedObject = SavedObject<ReindexOperation>;

export enum ReindexWarning {
  allField,
  booleanFields,
}
