/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `activity` document ingested from SentinelOne via the integration
 *
 * NOTE:  not all properties are currently mapped below. Check the index definition if wanting to
 *        see what else is available and add it bellow if needed
 */
export interface SentinelOneActivityEsDoc {
  sentinel_one: {
    activity: {
      agent: {
        /** This is the internal ID of the host in sentinelOne (NOT the agent's UUID) */
        id: string;
      };
      updated_at: string;
      description: {
        primary: string;
        secondary?: string;
      };
      id: string;
      /** The activity type. Valid values can be retrieved from S1 via API: `/web/api/v2.1/activities/types` */
      type: number;
    };
  };
}

export interface SentinelOneActionRequestCommonMeta {
  /** The S1 agent id */
  agentId: string;
  /** The S1 agent assigned UUID */
  agentUUID: string;
  /** The host name */
  hostName: string;
}

/** Metadata capture for the isolation actions (`isolate` and `release`) */
export type SentinelOneIsolationRequestMeta = SentinelOneActionRequestCommonMeta;

/** Metadata captured when creating the isolation response document in ES for both `isolate` and `release` */
export interface SentinelOneIsolationResponseMeta {
  /** The document ID in the Elasticsearch S1 activity index that was used to complete the response action */
  elasticDocId: string;
  /** The SentinelOne activity log entry ID */
  activityLogEntryId: string;
  /** The SentinelOne activity log entry type */
  activityLogEntryType: number;
  /** The SentinelOne activity log primary description */
  activityLogEntryDescription: string;
}

export interface SentinelOneGetFileRequestMeta extends SentinelOneActionRequestCommonMeta {
  /** The SentinelOne activity log entry id for the Get File request */
  activityId: string;
  /**
   * The command batch UUID is a value that appears in both the Request and the Response, thus it
   * is stored in the request to facilitate locating the response later by the background task
   */
  commandBatchUuid: string;
}
