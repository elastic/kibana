/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import { User } from '../../common/api';
import { Authorization } from '../authorization/authorization';
import {
  CaseConfigureService,
  CasesService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
  AlertService,
} from '../services';

/**
 * Parameters for initializing a cases client
 */
export interface CasesClientArgs {
  readonly caseConfigureService: CaseConfigureService;
  readonly caseService: CasesService;
  readonly connectorMappingsService: ConnectorMappingsService;
  readonly user: User;
  readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  readonly userActionService: CaseUserActionService;
  readonly alertsService: AlertService;
  readonly attachmentService: AttachmentService;
  readonly logger: Logger;
  readonly lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  readonly authorization: PublicMethodsOf<Authorization>;
  readonly actionsClient: PublicMethodsOf<ActionsClient>;
}
