/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { i18n } from '@kbn/i18n';

import { CONNECTORS_INDEX } from '../..';

import { isConfigEntry } from '../../../common/connectors/is_category_entry';
import {
  ConnectorConfiguration,
  ConnectorDocument,
  ConnectorStatus,
} from '../../../common/types/connectors';
import { isNotNullish } from '../../../common/utils/is_not_nullish';

import { fetchConnectorById } from './fetch_connectors';

export const updateConnectorConfiguration = async (
  client: IScopedClusterClient,
  connectorId: string,
  configuration: Record<string, string | number | boolean>
) => {
  const connectorResult = await fetchConnectorById(client, connectorId);
  const connector = connectorResult?.value;
  if (connector) {
    const status =
      connector.status === ConnectorStatus.NEEDS_CONFIGURATION
        ? ConnectorStatus.CONFIGURED
        : connector.status;
    const updatedConfig = Object.keys(connector.configuration)
      .map((key) => {
        const configEntry = connector.configuration[key];
        return isConfigEntry(configEntry)
          ? {
              ...configEntry, // ugly but needed because typescript refuses to believe this is defined
              key,
              value: configuration[key] ?? configEntry.value,
            }
          : undefined;
      })
      .filter(isNotNullish)
      .reduce((prev: ConnectorConfiguration, curr) => {
        const { key, ...config } = curr;
        return { ...prev, [curr.key]: config };
      }, {});
    await client.asCurrentUser.update<ConnectorDocument>({
      doc: { configuration: updatedConfig, status },
      id: connectorId,
      if_primary_term: connectorResult?.primaryTerm,
      if_seq_no: connectorResult?.seqNo,
      index: CONNECTORS_INDEX,
    });
    return updatedConfig;
  } else {
    throw new Error(
      i18n.translate('xpack.enterpriseSearch.server.connectors.configuration.error', {
        defaultMessage: 'Could not find connector',
      })
    );
  }
};
