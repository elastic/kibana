/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CONNECTORS_VERSION } from '../..';
import {
  ConnectorDocument,
  ConnectorStatus,
  FilteringPolicy,
  FilteringRuleRule,
  FilteringValidationState,
} from '../../../common/types/connectors';
import { ErrorCode } from '../../../common/types/error_codes';
import {
  DefaultConnectorsPipelineMeta,
  setupConnectorsIndices,
} from '../../index_management/setup_indices';

import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';
import { createIndex } from '../indices/create_index';

import { deleteConnectorById } from './delete_connector';

import { fetchConnectorByIndexName } from './fetch_connectors';

const createConnector = async (
  document: ConnectorDocument,
  client: IScopedClusterClient,
  language: string | null,
  deleteExisting: boolean
): Promise<{ id: string; index_name: string }> => {
  const index = document.index_name;
  const indexExists = await client.asCurrentUser.indices.exists({ index });
  if (indexExists) {
    {
      throw new Error(ErrorCode.INDEX_ALREADY_EXISTS);
    }
  }

  const connector = await fetchConnectorByIndexName(client, index);
  if (connector) {
    if (deleteExisting) {
      await deleteConnectorById(client, connector.id);
    } else {
      throw new Error(ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS);
    }
  }
  const crawler = await fetchCrawlerByIndexName(client, index);

  if (crawler) {
    throw new Error(ErrorCode.CRAWLER_ALREADY_EXISTS);
  }

  const result = await client.asCurrentUser.index({
    document,
    index: CONNECTORS_INDEX,
    refresh: true,
  });
  await createIndex(client, document.index_name, language, false);

  return { id: result._id, index_name: document.index_name };
};

export const addConnector = async (
  client: IScopedClusterClient,
  input: {
    delete_existing_connector?: boolean;
    index_name: string;
    is_native: boolean;
    language: string | null;
    service_type?: string | null;
  }
): Promise<{ id: string; index_name: string }> => {
  const connectorsIndexExists = await client.asCurrentUser.indices.exists({
    index: CONNECTORS_INDEX,
  });
  if (!connectorsIndexExists) {
    await setupConnectorsIndices(client.asCurrentUser);
  }
  const connectorsIndicesMapping = await client.asCurrentUser.indices.getMapping({
    index: CONNECTORS_INDEX,
  });
  const connectorsPipelineMeta: DefaultConnectorsPipelineMeta =
    connectorsIndicesMapping[`${CONNECTORS_INDEX}-v${CONNECTORS_VERSION}`]?.mappings?._meta
      ?.pipeline;

  const currentTimestamp = new Date().toISOString();
  const document: ConnectorDocument = {
    api_key_id: null,
    configuration: {},
    description: null,
    error: null,
    features: null,
    filtering: [
      {
        active: {
          advanced_snippet: {
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            value: {},
          },
          rules: [
            {
              created_at: currentTimestamp,
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: FilteringPolicy.INCLUDE,
              rule: FilteringRuleRule.REGEX,
              updated_at: currentTimestamp,
              value: '.*',
            },
          ],
          validation: {
            errors: [],
            state: FilteringValidationState.VALID,
          },
        },
        domain: 'DEFAULT',
        draft: {
          advanced_snippet: {
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            value: {},
          },
          rules: [
            {
              created_at: currentTimestamp,
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: FilteringPolicy.INCLUDE,
              rule: FilteringRuleRule.REGEX,
              updated_at: currentTimestamp,
              value: '.*',
            },
          ],
          validation: {
            errors: [],
            state: FilteringValidationState.VALID,
          },
        },
      },
    ],
    index_name: input.index_name,
    is_native: input.is_native,
    language: input.language,
    last_seen: null,
    last_sync_error: null,
    last_sync_status: null,
    last_synced: null,
    name: input.index_name.startsWith('search-') ? input.index_name.substring(7) : input.index_name,
    pipeline: connectorsPipelineMeta
      ? {
          extract_binary_content: connectorsPipelineMeta.default_extract_binary_content,
          name: connectorsPipelineMeta.default_name,
          reduce_whitespace: connectorsPipelineMeta.default_reduce_whitespace,
          run_ml_inference: connectorsPipelineMeta.default_run_ml_inference,
        }
      : null,
    scheduling: { enabled: false, interval: '0 0 0 * * ?' },
    service_type: input.service_type || null,
    status: ConnectorStatus.CREATED,
    sync_now: false,
  };
  return await createConnector(document, client, input.language, !!input.delete_existing_connector);
};
