/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  SavedObjectsServiceStart,
  Logger,
  ElasticsearchClient,
} from 'kibana/server';
import { SecurityPluginSetup, SecurityPluginStart } from '../../../security/server';
import { SAVED_OBJECT_TYPES } from '../../common/constants';
import { Authorization } from '../authorization/authorization';
import { GetSpaceFn } from '../authorization/types';
import {
  CaseConfigureService,
  CasesService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
  AlertService,
} from '../services';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { PluginStartContract as ActionsPluginStart } from '../../../actions/server';
import { LensServerPluginSetup } from '../../../lens/server';

import { AuthorizationAuditLogger } from '../authorization';
import { CasesClient, createCasesClient } from '.';

interface CasesClientFactoryArgs {
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  getSpace: GetSpaceFn;
  featuresPluginStart: FeaturesPluginStart;
  actionsPluginStart: ActionsPluginStart;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}

/**
 * This class handles the logic for creating a CasesClient. We need this because some of the member variables
 * can't be initialized until a plugin's start() method but we need to register the case context in the setup() method.
 */
export class CasesClientFactory {
  private isInitialized = false;
  private readonly logger: Logger;
  private options?: CasesClientFactoryArgs;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * This should be called by the plugin's start() method.
   */
  public initialize(options: CasesClientFactoryArgs) {
    if (this.isInitialized) {
      throw new Error('CasesClientFactory already initialized');
    }
    this.isInitialized = true;
    this.options = options;
  }

  /**
   * Creates a cases client for the current request. This request will be used to authorize the operations done through
   * the client.
   */
  public async create({
    request,
    scopedClusterClient,
    savedObjectsService,
  }: {
    request: KibanaRequest;
    savedObjectsService: SavedObjectsServiceStart;
    scopedClusterClient: ElasticsearchClient;
  }): Promise<CasesClient> {
    if (!this.isInitialized || !this.options) {
      throw new Error('CasesClientFactory must be initialized before calling create');
    }

    const auditLogger = this.options.securityPluginSetup?.audit.asScoped(request);

    const auth = await Authorization.create({
      request,
      securityAuth: this.options.securityPluginStart?.authz,
      getSpace: this.options.getSpace,
      features: this.options.featuresPluginStart,
      auditLogger: new AuthorizationAuditLogger(auditLogger),
      logger: this.logger,
    });

    const unsecuredSavedObjectsClient = savedObjectsService.getScopedClient(request, {
      includedHiddenTypes: SAVED_OBJECT_TYPES,
      // this tells the security plugin to not perform SO authorization and audit logging since we are handling
      // that manually using our Authorization class and audit logger.
      excludedWrappers: ['security'],
    });

    const attachmentService = new AttachmentService(this.logger);
    const caseService = new CasesService({
      log: this.logger,
      authentication: this.options?.securityPluginStart?.authc,
      unsecuredSavedObjectsClient,
      attachmentService,
    });
    const userInfo = caseService.getUser({ request });

    return createCasesClient({
      alertsService: new AlertService(scopedClusterClient, this.logger),
      unsecuredSavedObjectsClient,
      // We only want these fields from the userInfo object
      user: { username: userInfo.username, email: userInfo.email, full_name: userInfo.full_name },
      caseService,
      caseConfigureService: new CaseConfigureService(this.logger),
      connectorMappingsService: new ConnectorMappingsService(this.logger),
      userActionService: new CaseUserActionService(this.logger),
      attachmentService,
      logger: this.logger,
      lensEmbeddableFactory: this.options.lensEmbeddableFactory,
      authorization: auth,
      actionsClient: await this.options.actionsPluginStart.getActionsClientWithRequest(request),
    });
  }
}
