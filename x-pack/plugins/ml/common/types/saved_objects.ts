/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type JobType = 'anomaly-detector' | 'data-frame-analytics';
export const ML_SAVED_OBJECT_TYPE = 'ml-job';

type Result = Record<string, { success: boolean; error?: any }>;

export interface RepairSavedObjectResponse {
  savedObjectsCreated: Result;
  savedObjectsDeleted: Result;
  datafeedsAdded: Result;
  datafeedsRemoved: Result;
}
