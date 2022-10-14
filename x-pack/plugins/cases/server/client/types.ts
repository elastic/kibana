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
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { IBasePath } from '@kbn/core-http-browser';
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
import { LicensingService } from '../services/licensing';

export interface CasesServices {
  alertsService: AlertService;
  caseService: CasesService;
  caseConfigureService: CaseConfigureService;
  connectorMappingsService: ConnectorMappingsService;
  userActionService: CaseUserActionService;
  attachmentService: AttachmentService;
  licensingService: LicensingService;
}

/**
 * Parameters for initializing a cases client
 */
export interface CasesClientArgs {
  readonly services: CasesServices;
  readonly user: User;
  readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  readonly logger: Logger;
  readonly lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  readonly authorization: PublicMethodsOf<Authorization>;
  readonly actionsClient: PublicMethodsOf<ActionsClient>;
  readonly persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  readonly externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  readonly securityStartPlugin: SecurityPluginStart;
  readonly publicBaseUrl?: IBasePath['publicBaseUrl'];
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
  assignees?: string | string[];
}
