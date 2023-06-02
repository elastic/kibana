/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX } from '../..';
import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../common/constants';

import {
  ConnectorSyncConfiguration,
  ConnectorDocument,
  ConnectorSyncJobDocument,
  SyncStatus,
  TriggerMethod,
  SyncJobType,
} from '../../../common/types/connectors';
import { ErrorCode } from '../../../common/types/error_codes';

export const startConnectorSync = async (
  client: IScopedClusterClient,
  connectorId: string,
  jobType: SyncJobType,
  nextSyncConfig?: string
) => {
  const connectorResult = await client.asCurrentUser.get<ConnectorDocument>({
    id: connectorId,
    index: CONNECTORS_INDEX,
  });
  const connector = connectorResult._source;
  if (connector) {
    const configuration: ConnectorSyncConfiguration = nextSyncConfig
      ? {
          ...connector.configuration,
          nextSyncConfig: { label: 'nextSyncConfig', value: nextSyncConfig },
        }
      : connector.configuration;
    const { filtering, index_name, language, pipeline, service_type } = connector;

    const now = new Date().toISOString();

    if (connector.service_type === ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE) {
      return await client.asCurrentUser.update({
        doc: {
          configuration,
          sync_now: true,
        },
        id: connectorId,
        if_primary_term: connectorResult._primary_term,
        if_seq_no: connectorResult._seq_no,
        index: CONNECTORS_INDEX,
      });
    }

    return await client.asCurrentUser.index<ConnectorSyncJobDocument>({
      document: {
        cancelation_requested_at: null,
        canceled_at: null,
        completed_at: null,
        connector: {
          configuration,
          filtering: filtering ? filtering[0]?.active ?? null : null,
          id: connectorId,
          index_name,
          language,
          pipeline: pipeline ?? null,
          service_type,
        },
        created_at: now,
        deleted_document_count: 0,
        error: null,
        indexed_document_count: 0,
        indexed_document_volume: 0,
        job_type: jobType,
        last_seen: null,
        metadata: {},
        started_at: null,
        status: SyncStatus.PENDING,
        total_document_count: null,
        trigger_method: TriggerMethod.ON_DEMAND,
        worker_hostname: null,
      },
      index: CONNECTORS_JOBS_INDEX,
    });
  } else {
    throw new Error(ErrorCode.RESOURCE_NOT_FOUND);
  }
};
