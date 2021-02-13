/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import {
  CaseClientFactoryArguments,
  CaseClient,
  ConfigureFields,
  MappingsClient,
  CaseClientUpdateAlertsStatus,
  CaseClientAddComment,
  CaseClientGet,
  CaseClientGetUserActions,
  CaseClientGetAlerts,
  CaseClientPush,
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
import { CasesPatchRequest, CasePostRequest, User } from '../../common/api';
import { get } from './cases/get';
import { get as getUserActions } from './user_actions/get';
import { get as getAlerts } from './alerts/get';
import { push } from './cases/push';

/**
 * This class is a pass through for common case functionality (like creating, get a case).
 */
export class CaseClientHandler implements CaseClient {
  private readonly _scopedClusterClient: ElasticsearchClient;
  private readonly _caseConfigureService: CaseConfigureServiceSetup;
  private readonly _caseService: CaseServiceSetup;
  private readonly _connectorMappingsService: ConnectorMappingsServiceSetup;
  private readonly user: User;
  private readonly _savedObjectsClient: SavedObjectsClientContract;
  private readonly _userActionService: CaseUserActionServiceSetup;
  private readonly _alertsService: AlertServiceContract;

  constructor(clientArgs: CaseClientFactoryArguments) {
    this._scopedClusterClient = clientArgs.scopedClusterClient;
    this._caseConfigureService = clientArgs.caseConfigureService;
    this._caseService = clientArgs.caseService;
    this._connectorMappingsService = clientArgs.connectorMappingsService;
    this.user = clientArgs.user;
    this._savedObjectsClient = clientArgs.savedObjectsClient;
    this._userActionService = clientArgs.userActionService;
    this._alertsService = clientArgs.alertsService;
  }

  public async create(caseInfo: CasePostRequest) {
    return create({
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      caseConfigureService: this._caseConfigureService,
      userActionService: this._userActionService,
      user: this.user,
      theCase: caseInfo,
    });
  }

  public async update(cases: CasesPatchRequest) {
    return update({
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      userActionService: this._userActionService,
      user: this.user,
      cases,
      caseClient: this,
    });
  }

  public async addComment({ caseId, comment }: CaseClientAddComment) {
    return addComment({
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      userActionService: this._userActionService,
      caseClient: this,
      caseId,
      comment,
      user: this.user,
    });
  }

  public async getFields(fields: ConfigureFields) {
    return getFields(fields);
  }

  public async getMappings(args: MappingsClient) {
    return getMappings({
      ...args,
      savedObjectsClient: this._savedObjectsClient,
      connectorMappingsService: this._connectorMappingsService,
      caseClient: this,
    });
  }

  public async updateAlertsStatus(args: CaseClientUpdateAlertsStatus) {
    return updateAlertsStatus({
      ...args,
      alertsService: this._alertsService,
      scopedClusterClient: this._scopedClusterClient,
    });
  }

  public async get(args: CaseClientGet) {
    return get({
      ...args,
      caseService: this._caseService,
      savedObjectsClient: this._savedObjectsClient,
    });
  }

  public async getUserActions(args: CaseClientGetUserActions) {
    return getUserActions({
      ...args,
      savedObjectsClient: this._savedObjectsClient,
      userActionService: this._userActionService,
    });
  }

  public async getAlerts(args: CaseClientGetAlerts) {
    return getAlerts({
      ...args,
      alertsService: this._alertsService,
      scopedClusterClient: this._scopedClusterClient,
    });
  }

  public async push(args: CaseClientPush) {
    return push({
      ...args,
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      userActionService: this._userActionService,
      user: this.user,
      caseClient: this,
      caseConfigureService: this._caseConfigureService,
    });
  }
}
