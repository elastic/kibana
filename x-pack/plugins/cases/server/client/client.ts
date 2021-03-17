/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract, Logger } from 'src/core/server';
import {
  CasesClientFactoryArguments,
  CasesClient,
  ConfigureFields,
  MappingsClient,
  CasesClientUpdateAlertsStatus,
  CasesClientAddComment,
  CasesClientGet,
  CasesClientGetUserActions,
  CasesClientGetAlerts,
  CasesClientPush,
} from './types';
import { create } from './cases/create';
import { update } from './cases/update';
import { addComment } from './comments/add';
import { getFields } from './configure/get_fields';
import { getMappings } from './configure/get_mappings';
import { updateAlertsStatus } from './alerts/update_status';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  ConnectorMappingsServiceSetup,
  CaseUserActionServiceSetup,
  AlertServiceContract,
} from '../services';
import { CasesPatchRequest, CasePostRequest, User } from '../../common';
import { get } from './cases/get';
import { get as getUserActions } from './user_actions/get';
import { get as getAlerts } from './alerts/get';
import { push } from './cases/push';
import { createCaseError } from '../common/error';

/**
 * This class is a pass through for common case functionality (like creating, get a case).
 */
export class CasesClientHandler implements CasesClient {
  private readonly _scopedClusterClient: ElasticsearchClient;
  private readonly _caseConfigureService: CaseConfigureServiceSetup;
  private readonly _caseService: CaseServiceSetup;
  private readonly _connectorMappingsService: ConnectorMappingsServiceSetup;
  private readonly user: User;
  private readonly _savedObjectsClient: SavedObjectsClientContract;
  private readonly _userActionService: CaseUserActionServiceSetup;
  private readonly _alertsService: AlertServiceContract;
  private readonly logger: Logger;

  constructor(clientArgs: CasesClientFactoryArguments) {
    this._scopedClusterClient = clientArgs.scopedClusterClient;
    this._caseConfigureService = clientArgs.caseConfigureService;
    this._caseService = clientArgs.caseService;
    this._connectorMappingsService = clientArgs.connectorMappingsService;
    this.user = clientArgs.user;
    this._savedObjectsClient = clientArgs.savedObjectsClient;
    this._userActionService = clientArgs.userActionService;
    this._alertsService = clientArgs.alertsService;
    this.logger = clientArgs.logger;
  }

  public async create(caseInfo: CasePostRequest) {
    try {
      return create({
        savedObjectsClient: this._savedObjectsClient,
        caseService: this._caseService,
        caseConfigureService: this._caseConfigureService,
        userActionService: this._userActionService,
        user: this.user,
        theCase: caseInfo,
        logger: this.logger,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create a new case using client: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async update(cases: CasesPatchRequest) {
    try {
      return update({
        savedObjectsClient: this._savedObjectsClient,
        caseService: this._caseService,
        userActionService: this._userActionService,
        user: this.user,
        cases,
        casesClient: this,
        logger: this.logger,
      });
    } catch (error) {
      const caseIDVersions = cases.cases.map((caseInfo) => ({
        id: caseInfo.id,
        version: caseInfo.version,
      }));
      throw createCaseError({
        message: `Failed to update cases using client: ${JSON.stringify(caseIDVersions)}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async addComment({ caseId, comment }: CasesClientAddComment) {
    try {
      return addComment({
        savedObjectsClient: this._savedObjectsClient,
        caseService: this._caseService,
        userActionService: this._userActionService,
        casesClient: this,
        caseId,
        comment,
        user: this.user,
        logger: this.logger,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to add comment using client case id: ${caseId}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async getFields(fields: ConfigureFields) {
    try {
      return getFields(fields);
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve fields using client: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async getMappings(args: MappingsClient) {
    try {
      return getMappings({
        ...args,
        savedObjectsClient: this._savedObjectsClient,
        connectorMappingsService: this._connectorMappingsService,
        casesClient: this,
        logger: this.logger,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get mappings using client: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async updateAlertsStatus(args: CasesClientUpdateAlertsStatus) {
    try {
      return updateAlertsStatus({
        ...args,
        alertsService: this._alertsService,
        scopedClusterClient: this._scopedClusterClient,
        logger: this.logger,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update alerts status using client alerts: ${JSON.stringify(
          args.alerts
        )}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async get(args: CasesClientGet) {
    try {
      return get({
        ...args,
        caseService: this._caseService,
        savedObjectsClient: this._savedObjectsClient,
        logger: this.logger,
      });
    } catch (error) {
      this.logger.error(`Failed to get case using client id: ${args.id}: ${error}`);
      throw error;
    }
  }

  public async getUserActions(args: CasesClientGetUserActions) {
    try {
      return getUserActions({
        ...args,
        savedObjectsClient: this._savedObjectsClient,
        userActionService: this._userActionService,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get user actions using client id: ${args.caseId}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async getAlerts(args: CasesClientGetAlerts) {
    try {
      return getAlerts({
        ...args,
        alertsService: this._alertsService,
        scopedClusterClient: this._scopedClusterClient,
        logger: this.logger,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get alerts using client requested alerts: ${JSON.stringify(
          args.alertsInfo
        )}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async push(args: CasesClientPush) {
    try {
      return push({
        ...args,
        savedObjectsClient: this._savedObjectsClient,
        caseService: this._caseService,
        userActionService: this._userActionService,
        user: this.user,
        casesClient: this,
        caseConfigureService: this._caseConfigureService,
        logger: this.logger,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to push case using client id: ${args.caseId}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }
}
