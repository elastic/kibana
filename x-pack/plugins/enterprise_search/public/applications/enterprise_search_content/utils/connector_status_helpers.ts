/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConnectorStatus } from '@kbn/search-connectors';

export function connectorStatusToText(connectorStatus: ConnectorStatus): string {
  if (
    connectorStatus === ConnectorStatus.CREATED ||
    connectorStatus === ConnectorStatus.NEEDS_CONFIGURATION
  ) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.connectorStatus.needsConfig.label',
      { defaultMessage: 'Needs Configuration' }
    );
  }
  if (connectorStatus === ConnectorStatus.ERROR) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.connectorStatus.connectorFailure.label',
      { defaultMessage: 'Connector Failure' }
    );
  }
  if (connectorStatus === ConnectorStatus.CONFIGURED) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.configured.label',
      { defaultMessage: 'Configured' }
    );
  }
  if (connectorStatus === ConnectorStatus.CONNECTED) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.connected.label',
      { defaultMessage: 'Connected' }
    );
  }

  return i18n.translate(
    'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.incomplete.label',
    { defaultMessage: 'Incomplete' }
  );
}

export function connectorStatusToColor(
  connectorStatus: ConnectorStatus
): 'warning' | 'danger' | 'success' {
  if (connectorStatus === ConnectorStatus.CONNECTED) {
    return 'success';
  }
  if (connectorStatus === ConnectorStatus.ERROR) {
    return 'danger';
  }
  return 'warning';
}
