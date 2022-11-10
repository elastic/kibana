/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorStatus } from '../../../../../common/types/connectors';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';
import { NativeConnector } from '../../components/search_index/connector/types';

export interface SetNativeConnectorArgs {
  connectorId: string;
  nativeConnector: NativeConnector;
}

export interface SetNativeConnectorResponse {
  connectorId: string;
  nativeConnector: NativeConnector;
}

export const setNativeConnector = async ({
  connectorId,
  nativeConnector,
}: SetNativeConnectorArgs) => {
  const { configuration, serviceType } = nativeConnector;

  await HttpLogic.values.http.put(
    `/internal/enterprise_search/connectors/${connectorId}/service_type`,
    {
      body: JSON.stringify({ serviceType }),
    }
  );

  await HttpLogic.values.http.post(
    `/internal/enterprise_search/connectors/${connectorId}/configuration`,
    {
      body: JSON.stringify(configuration),
    }
  );

  await HttpLogic.values.http.put(`/internal/enterprise_search/connectors/${connectorId}/status`, {
    body: JSON.stringify({ status: ConnectorStatus.NEEDS_CONFIGURATION }),
  });

  return { connectorId };
};

export const SetNativeConnectorLogic = createApiLogic(
  ['content', 'service_type_connector_api_logic'],
  setNativeConnector
);
