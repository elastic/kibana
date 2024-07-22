/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { EsqlTransport } from '../../lib/esql_transport';
import { DetectionsClient } from './detections_client';
import {
  DetectionsServiceSetup,
  DetectionsServiceSetupDeps,
  DetectionsServiceStart,
  DetectionsServiceStartDeps,
} from './types';

export class DetectionsService {
  private getStartServices!: DetectionsServiceSetupDeps['getStartServices'];

  constructor(private readonly logger: Logger) {}

  public setup({ getStartServices }: DetectionsServiceSetupDeps): DetectionsServiceSetup {
    this.getStartServices = getStartServices;

    return {};
  }

  public start({ fieldsMetadata }: DetectionsServiceStartDeps): DetectionsServiceStart {
    const { logger } = this;

    return {
      async getClient(esClient) {
        const fieldsMetadataClient = await fieldsMetadata.getClient();
        const esqlTransport = new EsqlTransport(esClient);

        return DetectionsClient.create({ esClient, esqlTransport, fieldsMetadataClient, logger });
      },
    };
  }
}
