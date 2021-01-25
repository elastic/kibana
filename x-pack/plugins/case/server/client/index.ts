/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { KibanaRequest, SavedObjectsClientContract } from 'src/core/server';
import {
  CaseClientFactoryArguments,
  CaseClient,
  ConfigureFields,
  MappingsClient,
  CaseClientUpdateAlertsStatus,
} from './types';
import { create } from './cases/create';
import { update } from './cases/update';
import { addComment, addAlertGroup } from './comments/add';
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
import {
  CaseClientPostRequest,
  CaseConvertRequest,
  CaseConvertRequestRt,
  CaseResponse,
  CasesPatchRequest,
  CasesPatchRequestRt,
  CasesResponse,
  CaseType,
  CommentRequest,
  CommentRequestAlertGroupType,
  excess,
  throwErrors,
} from '../../common/api';

export { CaseClient } from './types';

/* export const createCaseClient = (clientArgs: CaseClientFactoryArguments): CaseClient => {
  return {
    create: create(clientArgs),
    update: update(clientArgs),
    addComment: addComment(clientArgs),
    addCommentFromRule: addCommentFromRule(clientArgs),
    getFields: getFields(),
    getMappings: getMappings(clientArgs),
    updateAlertsStatus: updateAlertsStatus(clientArgs),
  };
};*/

export const createCaseClient = (clientArgs: CaseClientFactoryArguments): CaseClient => {
  return new CaseClientImpl(clientArgs);
};

// TODO: rename
export class CaseClientImpl implements CaseClient {
  private readonly _caseConfigureService: CaseConfigureServiceSetup;
  private readonly _caseService: CaseServiceSetup;
  private readonly _connectorMappingsService: ConnectorMappingsServiceSetup;
  private readonly request: KibanaRequest;
  private readonly _savedObjectsClient: SavedObjectsClientContract;
  private readonly _userActionService: CaseUserActionServiceSetup;
  private readonly _alertsService: AlertServiceContract;

  // TODO: refactor so these are created in the constructor instead of passed in
  constructor(clientArgs: CaseClientFactoryArguments) {
    this._caseConfigureService = clientArgs.caseConfigureService;
    this._caseService = clientArgs.caseService;
    this._connectorMappingsService = clientArgs.connectorMappingsService;
    // TODO: extract this out so we just pass in the user information
    this.request = clientArgs.request;
    this._savedObjectsClient = clientArgs.savedObjectsClient;
    this._userActionService = clientArgs.userActionService;
    this._alertsService = clientArgs.alertsService;
  }

  public get caseService(): CaseServiceSetup {
    return this._caseService;
  }

  public get caseConfigureService(): CaseConfigureServiceSetup {
    return this._caseConfigureService;
  }

  public get connectorMappingsService(): ConnectorMappingsServiceSetup {
    return this._connectorMappingsService;
  }

  public get userActionService(): CaseUserActionServiceSetup {
    return this._userActionService;
  }

  public get alertsService(): AlertServiceContract {
    return this._alertsService;
  }

  public async create(caseInfo: CaseClientPostRequest) {
    return create({
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      caseConfigureService: this._caseConfigureService,
      userActionService: this._userActionService,
      request: this.request,
      theCase: caseInfo,
    });
  }

  /**
   * This enforces the restriction of not changing the case type field
   * @param cases requested cases to be updated
   */
  public async update(cases: CasesPatchRequest) {
    const validatedCases = pipe(
      excess(CasesPatchRequestRt).decode(cases),
      fold(throwErrors(Boom.badRequest), identity)
    );

    return update({
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      userActionService: this._userActionService,
      request: this.request,
      cases: validatedCases,
      caseClient: this,
    });
  }

  public async convertCaseToCollection(caseInfo: CaseConvertRequest) {
    const validatedRequest = pipe(
      excess(CaseConvertRequestRt).decode(caseInfo),
      fold(throwErrors(Boom.badRequest), identity)
    );

    return update({
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      userActionService: this._userActionService,
      request: this.request,
      cases: {
        cases: [{ ...validatedRequest, type: CaseType.parent }],
      },
      caseClient: this,
    });
  }

  public async addAlertGroup(caseId: string, comment: CommentRequestAlertGroupType) {
    return addAlertGroup({
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      userActionService: this._userActionService,
      caseClient: this,
      caseId,
      comment,
    });
  }

  public async addComment(caseId: string, comment: CommentRequest) {
    return addComment({
      savedObjectsClient: this._savedObjectsClient,
      caseService: this._caseService,
      userActionService: this._userActionService,
      caseClient: this,
      caseId,
      comment,
      request: this.request,
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
      request: this.request,
    });
  }
}
