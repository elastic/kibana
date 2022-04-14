/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import {
  AlertService,
  CaseConfigureService,
  CasesService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
} from '.';

export type CaseServiceMock = jest.Mocked<CasesService>;
export type CaseConfigureServiceMock = jest.Mocked<CaseConfigureService>;
export type ConnectorMappingsServiceMock = jest.Mocked<ConnectorMappingsService>;
export type CaseUserActionServiceMock = jest.Mocked<CaseUserActionService>;
export type AlertServiceMock = jest.Mocked<AlertService>;
export type AttachmentServiceMock = jest.Mocked<AttachmentService>;

export const createCaseServiceMock = (): CaseServiceMock => {
  const service: PublicMethodsOf<CasesService> = {
    deleteCase: jest.fn(),
    findCases: jest.fn(),
    getAllCaseComments: jest.fn(),
    getCase: jest.fn(),
    getCases: jest.fn(),
    getCaseIdsByAlertId: jest.fn(),
    getResolveCase: jest.fn(),
    getTags: jest.fn(),
    getReporters: jest.fn(),
    getUser: jest.fn(),
    postNewCase: jest.fn(),
    patchCase: jest.fn(),
    patchCases: jest.fn(),
    findCasesGroupedByID: jest.fn(),
    getCaseStatusStats: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as CaseServiceMock;
};

export const createConfigureServiceMock = (): CaseConfigureServiceMock => {
  const service: PublicMethodsOf<CaseConfigureService> = {
    delete: jest.fn(),
    get: jest.fn(),
    find: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as CaseConfigureServiceMock;
};

export const connectorMappingsServiceMock = (): ConnectorMappingsServiceMock => {
  const service: PublicMethodsOf<ConnectorMappingsService> = {
    find: jest.fn(),
    post: jest.fn(),
    update: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as ConnectorMappingsServiceMock;
};

export const createUserActionServiceMock = (): CaseUserActionServiceMock => {
  const service: PublicMethodsOf<CaseUserActionService> = {
    bulkCreateCaseDeletion: jest.fn(),
    bulkCreateUpdateCase: jest.fn(),
    bulkCreateAttachmentDeletion: jest.fn(),
    bulkCreateAttachmentCreation: jest.fn(),
    createUserAction: jest.fn(),
    create: jest.fn(),
    getAll: jest.fn(),
    bulkCreate: jest.fn(),
    findStatusChanges: jest.fn(),
    getUniqueConnectors: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as CaseUserActionServiceMock;
};

export const createAlertServiceMock = (): AlertServiceMock => {
  const service: PublicMethodsOf<AlertService> = {
    updateAlertsStatus: jest.fn(),
    getAlerts: jest.fn(),
    executeAggregations: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as AlertServiceMock;
};

export const createAttachmentServiceMock = (): AttachmentServiceMock => {
  const service: PublicMethodsOf<AttachmentService> = {
    get: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    bulkUpdate: jest.fn(),
    getAllAlertsAttachToCase: jest.fn(),
    countAlertsAttachedToCase: jest.fn(),
    executeCaseActionsAggregations: jest.fn(),
    getCaseCommentStats: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return service as unknown as AttachmentServiceMock;
};
