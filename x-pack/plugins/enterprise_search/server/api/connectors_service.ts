/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClient } from '@kbn/core-elasticsearch-server';
import { HttpServiceStart, KibanaRequest } from '@kbn/core-http-server';

import { CONNECTOR_DEFINITIONS } from '../../common/connectors/connectors';

import { Connector, IngestPipelineParams } from '../../common/types/connectors';

import { addConnector } from '../lib/connectors/add_connector';
import { fetchConnectors } from '../lib/connectors/fetch_connectors';

export class ConnectorsService {
  private readonly clusterClient: IClusterClient;
  private readonly http: HttpServiceStart;

  constructor({ clusterClient, http }: { clusterClient: IClusterClient; http: HttpServiceStart }) {
    this.clusterClient = clusterClient;
    this.http = http;
  }

  async createConnector(
    request: KibanaRequest,
    input: {
      indexName: string | null;
      isNative: boolean;
      language: string | null;
      pipeline?: IngestPipelineParams | null;
      serviceType: string | null;
    }
  ): Promise<Connector> {
    return await addConnector(this.clusterClient.asScoped(request), input);
  }

  getConnectorTypes() {
    return CONNECTOR_DEFINITIONS.map((connector) => ({
      ...connector,
      iconPath: connector.iconPath
        ? this.http.basePath.prepend(
            `/plugins/enterpriseSearch/assets/source_icons/${connector.iconPath}`
          )
        : 'logoEnterpriseSearch',
    }));
  }

  async getConnectors(request: KibanaRequest): Promise<Connector[]> {
    return await fetchConnectors(this.clusterClient.asScoped(request));
  }
}
