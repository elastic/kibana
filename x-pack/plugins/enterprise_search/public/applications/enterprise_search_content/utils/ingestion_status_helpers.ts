/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { IngestionStatus } from '../types';

export function ingestionStatusToText(ingestionStatus: IngestionStatus): string {
  if (ingestionStatus === IngestionStatus.CONNECTED) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.connected.label',
      { defaultMessage: 'Connected' }
    );
  }
  if (ingestionStatus === IngestionStatus.ERROR) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.connectorError.label',
      { defaultMessage: 'Connector failure' }
    );
  }
  if (ingestionStatus === IngestionStatus.SYNC_ERROR) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.syncError.label',
      { defaultMessage: 'Sync failure' }
    );
  }
  if (ingestionStatus === IngestionStatus.CONFIGURED) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.configured.label',
      { defaultMessage: 'Configured' }
    );
  }
  return i18n.translate(
    'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.incomplete.label',
    { defaultMessage: 'Incomplete' }
  );
}

export function ingestionStatusToColor(
  ingestionStatus: IngestionStatus
): 'warning' | 'danger' | 'success' {
  if (ingestionStatus === IngestionStatus.CONNECTED) {
    return 'success';
  }
  if (ingestionStatus === IngestionStatus.ERROR || ingestionStatus === IngestionStatus.SYNC_ERROR) {
    return 'danger';
  }
  return 'warning';
}
