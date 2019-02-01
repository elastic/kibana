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
  // Enum values are spaced out by 10 to give us room to insert steps in between.
  created = 0,
  indexConsumersStopped = 10,
  readonly = 20,
  newIndexCreated = 30,
  reindexStarted = 40,
  reindexCompleted = 50,
  aliasCreated = 60,
  indexConsumersStarted = 70,
}

export enum ReindexStatus {
  inProgress,
  completed,
  failed,
  paused,
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
  mlReindexCount: number | null;
}

export type ReindexSavedObject = SavedObject<ReindexOperation>;

export enum ReindexWarning {
  // 6.0 -> 7.0 warnings, now unused
  allField = 0,
  booleanFields = 1,

  // 7.0 -> 8.0 warnings
}
