/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract, Logger } from 'kibana/server';
import { User } from '../../common/api';
import { Authorization } from '../authorization/authorization';
import {
  AlertServiceContract,
  CaseConfigureService,
  CaseService,
  CaseUserActionService,
  ConnectorMappingsService,
} from '../services';
import { AlertSubClient } from './alerts/client';
import { AttachmentsSubClient } from './attachments/client';
import { CasesSubClient } from './cases/client';
import { ConfigureSubClient } from './configure/client';
import { UserActionsSubClient } from './user_actions/client';

export interface CasesClientArgs {
  readonly scopedClusterClient: ElasticsearchClient;
  readonly caseConfigureService: CaseConfigureService;
  readonly caseService: CaseService;
  readonly connectorMappingsService: ConnectorMappingsService;
  readonly user: User;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly userActionService: CaseUserActionService;
  readonly alertsService: AlertServiceContract;
  readonly logger: Logger;
  readonly authorization: Authorization;
}

/**
 * This represents the interface that other plugins can access.
 */

export interface CasesClient {
  readonly cases: CasesSubClient;
  readonly attachments: AttachmentsSubClient;
  readonly userActions: UserActionsSubClient;
}

/**
 * This represents the interface that cases uses internally.
 */

export interface CasesClientInternal {
  readonly alerts: AlertSubClient;
  readonly configuration: ConfigureSubClient;
}

export interface GetClientsFactories {
  readonly getCasesClient: () => CasesClient;
  readonly getCasesInternalClient: () => CasesClientInternal;
}

export type CasesSubClientImplementation<T> = (
  args: CasesClientArgs,
  getClientsFactories: GetClientsFactories
) => T;
