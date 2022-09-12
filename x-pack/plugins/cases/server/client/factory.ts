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
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { PluginStartContract as FeaturesPluginStart } from '@kbn/features-plugin/server';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SAVED_OBJECT_TYPES } from '../../common/constants';
import { Authorization } from '../authorization/authorization';
import {
  CaseConfigureService,
  CasesService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
  AlertService,
} from '../services';

import { AuthorizationAuditLogger } from '../authorization';
import { CasesClient, createCasesClient } from '.';
import { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import { CasesServices } from './types';

interface CasesClientFactoryArgs {
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  spacesPluginStart: SpacesPluginStart;
  featuresPluginStart: FeaturesPluginStart;
  actionsPluginStart: ActionsPluginStart;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
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
      spaces: this.options.spacesPluginStart,
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

    const services = this.createServices({
      unsecuredSavedObjectsClient,
      esClient: scopedClusterClient,
    });

    const userInfo = await this.getUserInfo(request);

    return createCasesClient({
      services,
      unsecuredSavedObjectsClient,
      user: userInfo,
      logger: this.logger,
      lensEmbeddableFactory: this.options.lensEmbeddableFactory,
      authorization: auth,
      actionsClient: await this.options.actionsPluginStart.getActionsClientWithRequest(request),
      persistableStateAttachmentTypeRegistry: this.options.persistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry: this.options.externalReferenceAttachmentTypeRegistry,
      securityStartPlugin: this.options.securityPluginStart,
    });
  }

  private createServices({
    unsecuredSavedObjectsClient,
    esClient,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
  }): CasesServices {
    if (!this.isInitialized || !this.options) {
      throw new Error('CasesClientFactory must be initialized before calling create');
    }

    const attachmentService = new AttachmentService(
      this.logger,
      this.options.persistableStateAttachmentTypeRegistry
    );

    const caseService = new CasesService({
      log: this.logger,
      unsecuredSavedObjectsClient,
      attachmentService,
    });

    return {
      alertsService: new AlertService(esClient, this.logger),
      caseService,
      caseConfigureService: new CaseConfigureService(this.logger),
      connectorMappingsService: new ConnectorMappingsService(this.logger),
      userActionService: new CaseUserActionService(
        this.logger,
        this.options.persistableStateAttachmentTypeRegistry
      ),
      attachmentService,
    };
  }

  /**
   * This function attempts to retrieve the current user's info. The first method is using the user profile api
   * provided by the security plugin. If that fails or the session isn't found then we will attempt using authc
   * which will not retrieve the profile uid but at least gets us the username and sometimes full name, and email.
   *
   * This function also forces the fields to be strings or null (except the profile uid since it's optional anyway)
   * because the get case API expects a created_by field to be set. If we leave the fields as undefined
   * then the resulting object in ES will just be empty and it'll fail to encode the user when returning it to the API
   * request. If we force them to be null it will succeed.
   */
  private async getUserInfo(request: KibanaRequest): Promise<{
    username: string | null;
    full_name: string | null;
    email: string | null;
    profile_uid?: string;
  }> {
    if (!this.isInitialized || !this.options) {
      throw new Error('CasesClientFactory must be initialized before calling create');
    }

    try {
      const userProfile = await this.options.securityPluginStart?.userProfiles.getCurrent({
        request,
      });

      if (userProfile != null) {
        return {
          username: userProfile.user.username,
          full_name: userProfile.user.full_name ?? null,
          email: userProfile.user.email ?? null,
          profile_uid: userProfile.uid,
        };
      }
    } catch (error) {
      this.logger.debug(`Failed to retrieve user profile, falling back to authc: ${error}`);
    }

    try {
      const user = this.options.securityPluginStart?.authc.getCurrentUser(request);

      if (user != null) {
        return {
          username: user.username,
          full_name: user.full_name ?? null,
          email: user.email ?? null,
        };
      }
    } catch (error) {
      this.logger.debug(`Failed to retrieve user info from authc: ${error}`);
    }

    return {
      username: null,
      full_name: null,
      email: null,
    };
  }
}
