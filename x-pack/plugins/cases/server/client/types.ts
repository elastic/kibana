/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { IBasePath } from '@kbn/core-http-browser';
import type { KueryNode } from '@kbn/es-query';
import type { CasesFindRequest, User } from '../../common/api';
import type { Authorization } from '../authorization/authorization';
import type {
  CaseConfigureService,
  CasesService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
  AlertService,
} from '../services';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type { LicensingService } from '../services/licensing';
import type { NotificationService } from '../services/notifications/types';

export interface CasesServices {
  alertsService: AlertService;
  caseService: CasesService;
  caseConfigureService: CaseConfigureService;
  connectorMappingsService: ConnectorMappingsService;
  userActionService: CaseUserActionService;
  attachmentService: AttachmentService;
  licensingService: LicensingService;
  notificationService: NotificationService;
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
  readonly spaceId: string;
  readonly publicBaseUrl?: IBasePath['publicBaseUrl'];
}

export type CasesFindQueryParams = Partial<
  Pick<
    CasesFindRequest,
    'tags' | 'reporters' | 'status' | 'severity' | 'owner' | 'from' | 'to' | 'assignees'
  > & { sortByField?: string; authorizationFilter?: KueryNode }
>;
