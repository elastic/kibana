/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import {
  AlertServiceContract,
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
export type AlertServiceMock = jest.Mocked<AlertServiceContract>;
export type AttachmentServiceMock = jest.Mocked<AttachmentService>;

export const createCaseServiceMock = (): CaseServiceMock => {
  const service: PublicMethodsOf<CasesService> = {
    createSubCase: jest.fn(),
    deleteCase: jest.fn(),
    deleteSubCase: jest.fn(),
    findCases: jest.fn(),
    findSubCases: jest.fn(),
    findSubCasesByCaseId: jest.fn(),
    getAllCaseComments: jest.fn(),
    getAllSubCaseComments: jest.fn(),
    getCase: jest.fn(),
    getCases: jest.fn(),
    getCaseIdsByAlertId: jest.fn(),
    getMostRecentSubCase: jest.fn(),
    getSubCase: jest.fn(),
    getSubCases: jest.fn(),
    getTags: jest.fn(),
    getReporters: jest.fn(),
    getUser: jest.fn(),
    postNewCase: jest.fn(),
    patchCase: jest.fn(),
    patchCases: jest.fn(),
    patchSubCase: jest.fn(),
    patchSubCases: jest.fn(),
    findSubCaseStatusStats: jest.fn(),
    getCommentsByAssociation: jest.fn(),
    getCaseCommentStats: jest.fn(),
    findSubCasesGroupByCase: jest.fn(),
    findCaseStatusStats: jest.fn(),
    findCasesGroupedByID: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return (service as unknown) as CaseServiceMock;
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
  return (service as unknown) as CaseConfigureServiceMock;
};

export const connectorMappingsServiceMock = (): ConnectorMappingsServiceMock => {
  const service: PublicMethodsOf<ConnectorMappingsService> = {
    find: jest.fn(),
    post: jest.fn(),
    update: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return (service as unknown) as ConnectorMappingsServiceMock;
};

export const createUserActionServiceMock = (): CaseUserActionServiceMock => {
  const service: PublicMethodsOf<CaseUserActionService> = {
    getAll: jest.fn(),
    bulkCreate: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return (service as unknown) as CaseUserActionServiceMock;
};

export const createAlertServiceMock = (): AlertServiceMock => ({
  updateAlertsStatus: jest.fn(),
  getAlerts: jest.fn(),
});

export const createAttachmentServiceMock = (): AttachmentServiceMock => {
  const service: PublicMethodsOf<AttachmentService> = {
    get: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    bulkUpdate: jest.fn(),
  };

  // the cast here is required because jest.Mocked tries to include private members and would throw an error
  return (service as unknown) as AttachmentServiceMock;
};
