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
import { KueryNode } from '@kbn/es-query';
import { CaseSeverity, CaseStatuses, User } from '../../common/api';
import { Authorization } from '../authorization/authorization';
import {
  CaseConfigureService,
  CasesService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
  AlertService,
} from '../services';
import { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';

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
  readonly persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  readonly externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
}

export interface ConstructQueryParams {
  tags?: string | string[];
  reporters?: string | string[];
  status?: CaseStatuses;
  severity?: CaseSeverity;
  sortByField?: string;
  owner?: string | string[];
  authorizationFilter?: KueryNode;
  from?: string;
  to?: string;
}
