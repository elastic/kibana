/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import { InMemoryConnector } from '../../../../..';
import { ActionsClientContext } from '../../../../../actions_client';
import { Connector } from '../../../types';

export interface GetAllParams {
  includeSystemActions?: boolean;
  context: ActionsClientContext;
}

export interface GetAllUnsecuredParams {
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
  inMemoryConnectors: InMemoryConnector[];
  internalSavedObjectsRepository: ISavedObjectsRepository;
  kibanaIndices: string[];
  logger: Logger;
  spaceId: string;
}

export interface InjectExtraFindDataParams {
  kibanaIndices: string[];
  esClient: ElasticsearchClient;
  connectors: Connector[];
}
