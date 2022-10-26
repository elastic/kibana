/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../../common/constants';
import { SyncStatus, ConnectorStatus } from '../../../../common/types/connectors';
import {
  ConnectorIndex,
  CrawlerIndex,
  ElasticsearchIndexWithIngestion,
} from '../../../../common/types/indices';

import {
  ApiViewIndex,
  ConnectorViewIndex,
  CrawlerViewIndex,
  ElasticsearchViewIndex,
  IngestionMethod,
  IngestionStatus,
} from '../types';

export function isConnectorIndex(
  index: ElasticsearchIndexWithIngestion | undefined
): index is ConnectorIndex {
  const connectorIndex = index as ConnectorIndex;
  return (
    !!connectorIndex?.connector &&
    connectorIndex.connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
  );
}

export function isCrawlerIndex(
  index: ElasticsearchIndexWithIngestion | undefined
): index is CrawlerIndex {
  return !!(index as CrawlerIndex)?.crawler;
}

export function isApiIndex(index: ElasticsearchIndexWithIngestion | undefined): boolean {
  if (!index) {
    return false;
  }
  return !isConnectorIndex(index) && !isCrawlerIndex(index);
}

export function isConnectorViewIndex(index: ElasticsearchViewIndex): index is ConnectorViewIndex {
  const connectorViewIndex = index as ConnectorViewIndex;
  return (
    !!connectorViewIndex?.connector &&
    connectorViewIndex.connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
  );
}

export function isCrawlerViewIndex(index: ElasticsearchViewIndex): index is CrawlerViewIndex {
  return !!(index as CrawlerViewIndex)?.crawler;
}

export function isApiViewIndex(index: ElasticsearchViewIndex): index is ApiViewIndex {
  return !!index && !isConnectorViewIndex(index) && !isCrawlerViewIndex(index);
}

export function getIngestionMethod(index?: ElasticsearchIndexWithIngestion): IngestionMethod {
  if (!index) return IngestionMethod.API;
  if (isConnectorIndex(index)) {
    return IngestionMethod.CONNECTOR;
  }
  if (isCrawlerIndex(index)) {
    return IngestionMethod.CRAWLER;
  }
  return IngestionMethod.API;
}

export function getIngestionStatus(index?: ElasticsearchIndexWithIngestion): IngestionStatus {
  if (!index || isApiIndex(index)) {
    return IngestionStatus.CONNECTED;
  }
  if (isConnectorIndex(index)) {
    if (
      index.connector.last_seen &&
      moment(index.connector.last_seen).isBefore(moment().subtract(30, 'minutes'))
    ) {
      return IngestionStatus.ERROR;
    }
    if (index.connector.last_sync_status === SyncStatus.ERROR) {
      return IngestionStatus.SYNC_ERROR;
    }
    if (index.connector.status === ConnectorStatus.CONNECTED) {
      return IngestionStatus.CONNECTED;
    }
    if (index.connector.status === ConnectorStatus.ERROR) {
      return IngestionStatus.ERROR;
    }
  }
  return IngestionStatus.INCOMPLETE;
}

export function getLastUpdated(index?: ElasticsearchIndexWithIngestion): string | null {
  return isConnectorIndex(index) ? index.connector.last_synced ?? 'never' : null;
}

export function indexToViewIndex(
  index: ConnectorIndex | CrawlerIndex | ElasticsearchIndexWithIngestion
): ConnectorViewIndex;
export function indexToViewIndex(
  index: ConnectorIndex | CrawlerIndex | ElasticsearchIndexWithIngestion
): CrawlerViewIndex;
export function indexToViewIndex(
  index: ConnectorIndex | CrawlerIndex | ElasticsearchIndexWithIngestion
): ApiViewIndex {
  const extraFields = {
    ingestionMethod: getIngestionMethod(index),
    ingestionStatus: getIngestionStatus(index),
    lastUpdated: getLastUpdated(index),
  };
  if (isConnectorIndex(index)) {
    const connectorResult: ConnectorViewIndex = { ...index, ...extraFields };
    return connectorResult;
  }
  if (isCrawlerIndex(index)) {
    const crawlerResult: CrawlerViewIndex = { ...index, ...extraFields };
    return crawlerResult;
  }
  const apiResult: ApiViewIndex = { ...index, ...extraFields };
  return apiResult;
}

export function ingestionMethodToText(ingestionMethod: IngestionMethod) {
  if (ingestionMethod === IngestionMethod.CONNECTOR) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionMethod.connector',
      {
        defaultMessage: 'Connector',
      }
    );
  }
  if (ingestionMethod === IngestionMethod.CRAWLER) {
    return i18n.translate('xpack.enterpriseSearch.content.searchIndices.ingestionMethod.crawler', {
      defaultMessage: 'Crawler',
    });
  }
  return i18n.translate('xpack.enterpriseSearch.content.searchIndices.ingestionMethod.api', {
    defaultMessage: 'API',
  });
}
