/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { ElasticsearchClient, SavedObjectsClientContract, Logger } from 'kibana/server';
import { User } from '../../common/api';
import { Authorization } from '../authorization/authorization';
import { CaseConnectors } from '../connectors/types';
import {
  AlertServiceContract,
  CaseConfigureService,
  CaseService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
} from '../services';

export interface CasesClientArgs {
  readonly scopedClusterClient: ElasticsearchClient;
  readonly caseConfigureService: CaseConfigureService;
  readonly caseService: CaseService;
  readonly connectorMappingsService: ConnectorMappingsService;
  readonly user: User;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly userActionService: CaseUserActionService;
  readonly alertsService: AlertServiceContract;
  readonly attachmentService: AttachmentService;
  readonly logger: Logger;
  readonly authorization: PublicMethodsOf<Authorization>;
  readonly casesConnectors: CaseConnectors;
}
