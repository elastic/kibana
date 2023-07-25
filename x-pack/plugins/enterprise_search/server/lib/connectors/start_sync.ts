/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CURRENT_CONNECTORS_JOB_INDEX } from '../..';
import { isConfigEntry } from '../../../common/connectors/is_category_entry';

import {
  CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX,
  ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
} from '../../../common/constants';

import {
  ConnectorConfiguration,
  ConnectorDocument,
  SyncJobType,
  SyncStatus,
  TriggerMethod,
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
    const config = Object.entries(connector.configuration).reduce((acc, [key, configEntry]) => {
      if (isConfigEntry(configEntry)) {
        acc[key] = configEntry;
      }
      return acc;
    }, {} as ConnectorConfiguration);
    const configuration = nextSyncConfig
      ? {
          ...config,
          nextSyncConfig: { label: 'nextSyncConfig', value: nextSyncConfig },
        }
      : config;
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

    const indexNameWithoutSearchPrefix = index_name.replace('search-', '');
    const targetIndexName =
      jobType === SyncJobType.ACCESS_CONTROL
        ? `${CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX}${indexNameWithoutSearchPrefix}`
        : index_name;

    return await client.asCurrentUser.index({
      document: {
        cancelation_requested_at: null,
        canceled_at: null,
        completed_at: null,
        connector: {
          configuration,
          filtering: filtering ? filtering[0]?.active ?? null : null,
          id: connectorId,
          index_name: targetIndexName,
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
      index: CURRENT_CONNECTORS_JOB_INDEX,
    });
  } else {
    throw new Error(ErrorCode.RESOURCE_NOT_FOUND);
  }
};
