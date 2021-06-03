/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertServiceContract,
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
  ConnectorMappingsServiceSetup,
} from '.';

export type CaseServiceMock = jest.Mocked<CaseServiceSetup>;
export type CaseConfigureServiceMock = jest.Mocked<CaseConfigureServiceSetup>;
export type ConnectorMappingsServiceMock = jest.Mocked<ConnectorMappingsServiceSetup>;
export type CaseUserActionServiceMock = jest.Mocked<CaseUserActionServiceSetup>;
export type AlertServiceMock = jest.Mocked<AlertServiceContract>;

export const createCaseServiceMock = (): CaseServiceMock => ({
  createSubCase: jest.fn(),
  deleteCase: jest.fn(),
  deleteComment: jest.fn(),
  deleteSubCase: jest.fn(),
  findCases: jest.fn(),
  findSubCases: jest.fn(),
  findSubCasesByCaseId: jest.fn(),
  getAllCaseComments: jest.fn(),
  getAllSubCaseComments: jest.fn(),
  getCase: jest.fn(),
  getCases: jest.fn(),
  getCaseIdsByAlertId: jest.fn(),
  getComment: jest.fn(),
  getMostRecentSubCase: jest.fn(),
  getSubCase: jest.fn(),
  getSubCases: jest.fn(),
  getTags: jest.fn(),
  getReporters: jest.fn(),
  getUser: jest.fn(),
  postNewCase: jest.fn(),
  postNewComment: jest.fn(),
  patchCase: jest.fn(),
  patchCases: jest.fn(),
  patchComment: jest.fn(),
  patchComments: jest.fn(),
  patchSubCase: jest.fn(),
  patchSubCases: jest.fn(),
  findSubCaseStatusStats: jest.fn(),
  getCommentsByAssociation: jest.fn(),
  getCaseCommentStats: jest.fn(),
  findSubCasesGroupByCase: jest.fn(),
  findCaseStatusStats: jest.fn(),
  findCasesGroupedByID: jest.fn(),
});

export const createConfigureServiceMock = (): CaseConfigureServiceMock => ({
  delete: jest.fn(),
  get: jest.fn(),
  find: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
});

export const connectorMappingsServiceMock = (): ConnectorMappingsServiceMock => ({
  find: jest.fn(),
  post: jest.fn(),
});

export const createUserActionServiceMock = (): CaseUserActionServiceMock => ({
  getUserActions: jest.fn(),
  postUserActions: jest.fn(),
});

export const createAlertServiceMock = (): AlertServiceMock => ({
  updateAlertsStatus: jest.fn(),
  getAlerts: jest.fn(),
});
