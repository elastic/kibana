/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { i18n } from '@kbn/i18n';

import { SyncStatus, ConnectorStatus } from '../../../../common/types/connectors';
import { ElasticsearchIndexWithIngestion } from '../../../../common/types/indices';

import { ElasticsearchViewIndex, IngestionMethod, IngestionStatus } from '../types';

export function getIngestionMethod(index?: ElasticsearchIndexWithIngestion): IngestionMethod {
  if (index?.connector) {
    return IngestionMethod.CONNECTOR;
  }
  if (index?.crawler) {
    return IngestionMethod.CRAWLER;
  }
  return IngestionMethod.API;
}

export function getIngestionStatus(index?: ElasticsearchIndexWithIngestion): IngestionStatus {
  const ingestionMethod = getIngestionMethod(index);
  if (!index || ingestionMethod === IngestionMethod.API) {
    return IngestionStatus.CONNECTED;
  }
  if (ingestionMethod === IngestionMethod.CONNECTOR) {
    if (
      index.connector?.last_seen &&
      moment(index.connector.last_seen).isBefore(moment().subtract(30, 'minutes'))
    ) {
      return IngestionStatus.ERROR;
    }
    if (index?.connector?.last_sync_status === SyncStatus.ERROR) {
      return IngestionStatus.SYNC_ERROR;
    }
    if (index?.connector?.status === ConnectorStatus.CONNECTED) {
      return IngestionStatus.CONNECTED;
    }
    if (index?.connector?.status === ConnectorStatus.ERROR) {
      return IngestionStatus.ERROR;
    }
  }
  return IngestionStatus.INCOMPLETE;
}

export function getLastUpdated(index?: ElasticsearchIndexWithIngestion): string | null {
  return index?.connector ? index?.connector.last_synced ?? 'never' : null;
}

export function indexToViewIndex(
  index?: ElasticsearchIndexWithIngestion
): ElasticsearchViewIndex | undefined {
  return index
    ? {
        ...index,
        ingestionMethod: getIngestionMethod(index),
        ingestionStatus: getIngestionStatus(index),
        lastUpdated: getLastUpdated(index),
      }
    : undefined;
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
