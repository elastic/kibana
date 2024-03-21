/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/sentinelone/constants';

type ConnectorActionsExecuteOptions = Parameters<ActionsClient['execute']>[0];

interface SentinelOneConnectorExecuteParams<
  P extends Record<string, unknown> = Record<string, unknown>
> {
  subAction: SUB_ACTION;
  subActionParams: P;
}

export type SentinelOneConnectorExecuteOptions<
  P extends Record<string, unknown> = Record<string, any>
> = Omit<ConnectorActionsExecuteOptions, 'params'> & {
  params: SentinelOneConnectorExecuteParams<P> & Record<string, unknown>;
};

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

/**
 * The `activity` document ingested from SentinelOne via the integration
 *
 * NOTE:  not all properties are currently mapped below. Check the index definition if wanting to
 *        see what else is available and add it bellow if needed
 */
export interface SentinelOneActivityDoc {
  sentinel_one: {
    activity: {
      agent: {
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
