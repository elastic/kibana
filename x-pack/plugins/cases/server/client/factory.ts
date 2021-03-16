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
  AlertServiceContract,
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
  ConnectorMappingsServiceSetup,
} from '../services';
import { CasesClientHandler } from './client';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';

interface CasesClientFactoryArgs {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  alertsService: AlertServiceContract;
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  getSpace: GetSpaceFn;
  featuresPluginStart: FeaturesPluginStart;
  isAuthEnabled: boolean;
}

/**
 * This class handles the logic for creating a CasesClientHandler. We need this because some of the member variables
 * can't be initialized until a plugin's start() method but we need to register the case context in the setup() method.
 */
export class CasesClientFactory {
  private isInitialized = false;
  private readonly logger: Logger;
  private options?: CasesClientFactoryArgs;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public initialize(options: CasesClientFactoryArgs) {
    if (this.isInitialized) {
      throw new Error('CasesClientFactory already initialized');
    }
    this.isInitialized = true;
    this.options = options;
  }

  public async create({
    request,
    scopedClusterClient,
    savedObjectsService,
  }: {
    // TODO: make these required when the case connector can get a request and savedObjectsService
    request?: KibanaRequest;
    savedObjectsService?: SavedObjectsServiceStart;
    scopedClusterClient: ElasticsearchClient;
  }): Promise<CasesClientHandler> {
    if (!this.options) {
      throw new Error('CasesClientFactory must be initialized before calling create');
    }

    // TODO: remove this
    if (!request || !savedObjectsService) {
      throw new Error(
        'CasesClientFactory must be initialized with a request and saved object service'
      );
    }

    const auth = await Authorization.create({
      request,
      securityAuth: this.options.securityPluginStart?.authz,
      getSpace: this.options.getSpace,
      features: this.options.featuresPluginStart,
      isAuthEnabled: this.options.isAuthEnabled,
    });

    const user = this.options.caseService.getUser({ request });

    return new CasesClientHandler({
      alertsService: this.options.alertsService,
      scopedClusterClient,
      savedObjectsClient: savedObjectsService.getScopedClient(request, {
        includedHiddenTypes: SAVED_OBJECT_TYPES,
      }),
      user,
      caseService: this.options.caseService,
      caseConfigureService: this.options.caseConfigureService,
      connectorMappingsService: this.options.connectorMappingsService,
      userActionService: this.options.userActionService,
      logger: this.logger,
      authorization: auth,
    });
  }
}
