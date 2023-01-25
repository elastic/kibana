/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  SavedObjectsServiceStart,
  Logger,
  ElasticsearchClient,
  SavedObjectsClientContract,
  IBasePath,
} from '@kbn/core/server';
import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type {
  AuditLogger,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/server';
import type { PluginStartContract as FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
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
import type { CasesClient } from '.';
import { createCasesClient } from '.';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type { CasesServices } from './types';
import { LicensingService } from '../services/licensing';
import { EmailNotificationService } from '../services/notifications/email_notification_service';

interface CasesClientFactoryArgs {
  securityPluginSetup: SecurityPluginSetup;
  securityPluginStart: SecurityPluginStart;
  spacesPluginStart: SpacesPluginStart;
  featuresPluginStart: FeaturesPluginStart;
  actionsPluginStart: ActionsPluginStart;
  licensingPluginStart: LicensingPluginStart;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  publicBaseUrl?: IBasePath['publicBaseUrl'];
  notifications: NotificationsPluginStart;
}

/**
 * This class handles the logic for creating a CasesClient. We need this because some of the member variables
 * can't be initialized until a plugin's start() method but we need to register the case context in the setup() method.
 */
export class CasesClientFactory {
  private isInitialized = false;
  private readonly logger: Logger;
  // The reason this is protected is because we'll get type collisions otherwise because we're using a type guard assert
  // to ensure the options member is instantiated before using it in various places
  // See for more info: https://stackoverflow.com/questions/66206180/typescript-typeguard-attribut-with-method
  protected options?: CasesClientFactoryArgs;

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
    this.validateInitialization();

    const auditLogger = this.options.securityPluginSetup.audit.asScoped(request);

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
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });

    const savedObjectsSerializer = savedObjectsService.createSerializer();

    const services = this.createServices({
      unsecuredSavedObjectsClient,
      savedObjectsSerializer,
      esClient: scopedClusterClient,
      request,
      auditLogger,
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
      publicBaseUrl: this.options.publicBaseUrl,
      spaceId: this.options.spacesPluginStart.spacesService.getSpaceId(request),
      savedObjectsSerializer,
    });
  }

  private validateInitialization(): asserts this is this & { options: CasesClientFactoryArgs } {
    if (!this.isInitialized || this.options == null) {
      throw new Error('CasesClientFactory must be initialized before calling create');
    }
  }

  private createServices({
    unsecuredSavedObjectsClient,
    savedObjectsSerializer,
    esClient,
    request,
    auditLogger,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    savedObjectsSerializer: ISavedObjectsSerializer;
    esClient: ElasticsearchClient;
    request: KibanaRequest;
    auditLogger: AuditLogger;
  }): CasesServices {
    this.validateInitialization();

    const attachmentService = new AttachmentService({
      log: this.logger,
      persistableStateAttachmentTypeRegistry: this.options.persistableStateAttachmentTypeRegistry,
      unsecuredSavedObjectsClient,
    });

    const caseService = new CasesService({
      log: this.logger,
      unsecuredSavedObjectsClient,
      attachmentService,
    });

    const licensingService = new LicensingService(
      this.options.licensingPluginStart.license$,
      this.options.licensingPluginStart.featureUsage.notifyUsage
    );

    /**
     * The notifications plugins only exports the EmailService.
     * We do the same. If in the future we use other means
     * of notifications we can refactor to use a factory.
     */
    const notificationService = new EmailNotificationService({
      logger: this.logger,
      notifications: this.options.notifications,
      security: this.options.securityPluginStart,
      publicBaseUrl: this.options.publicBaseUrl,
      spaceId: this.options.spacesPluginStart.spacesService.getSpaceId(request),
    });

    return {
      alertsService: new AlertService(esClient, this.logger),
      caseService,
      caseConfigureService: new CaseConfigureService(this.logger),
      connectorMappingsService: new ConnectorMappingsService(this.logger),
      userActionService: new CaseUserActionService({
        log: this.logger,
        persistableStateAttachmentTypeRegistry: this.options.persistableStateAttachmentTypeRegistry,
        unsecuredSavedObjectsClient,
        savedObjectsSerializer,
        auditLogger,
      }),
      attachmentService,
      licensingService,
      notificationService,
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
    this.validateInitialization();

    try {
      const userProfile = await this.options.securityPluginStart.userProfiles.getCurrent({
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
      const user = this.options.securityPluginStart.authc.getCurrentUser(request);

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
