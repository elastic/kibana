/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MissingPrivileges {
  [key: string]: string[] | undefined;
}

export interface Privileges {
  hasAllPrivileges: boolean;
  missingPrivileges: MissingPrivileges;
}

export type TransformId = string;

// reflects https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/dataframe/transforms/DataFrameTransformStats.java#L243
export enum TRANSFORM_STATE {
  ABORTING = 'aborting',
  FAILED = 'failed',
  INDEXING = 'indexing',
  STARTED = 'started',
  STOPPED = 'stopped',
  STOPPING = 'stopping',
}

export interface TransformEndpointRequest {
  id: TransformId;
  state?: TRANSFORM_STATE;
}

export interface ResultData {
  success: boolean;
  error?: any;
}

export interface TransformEndpointResult {
  [key: string]: ResultData;
}

export interface DeleteTransformEndpointRequest {
  transformsInfo: TransformEndpointRequest[];
  deleteDestIndex?: boolean;
  deleteDestIndexPattern?: boolean;
  forceDelete?: boolean;
}

export interface DeleteTransformStatus {
  transformDeleted: ResultData;
  destIndexDeleted?: ResultData;
  destIndexPatternDeleted?: ResultData;
  destinationIndex?: string | undefined;
}

export interface DeleteTransformEndpointResult {
  [key: string]: DeleteTransformStatus;
}
