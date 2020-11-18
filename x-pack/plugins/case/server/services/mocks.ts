/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
  ConnectorMappingsServiceSetup,
} from '.';

export type CaseServiceMock = jest.Mocked<CaseServiceSetup>;
export type CaseConfigureServiceMock = jest.Mocked<CaseConfigureServiceSetup>;
export type ConnectorMappingsServiceMock = jest.Mocked<ConnectorMappingsServiceSetup>;
export type CaseUserActionServiceMock = jest.Mocked<CaseUserActionServiceSetup>;

export const createCaseServiceMock = (): CaseServiceMock => ({
  deleteCase: jest.fn(),
  deleteComment: jest.fn(),
  findCases: jest.fn(),
  getAllCaseComments: jest.fn(),
  getCase: jest.fn(),
  getCases: jest.fn(),
  getComment: jest.fn(),
  getTags: jest.fn(),
  getReporters: jest.fn(),
  getUser: jest.fn(),
  postNewCase: jest.fn(),
  postNewComment: jest.fn(),
  patchCase: jest.fn(),
  patchCases: jest.fn(),
  patchComment: jest.fn(),
  patchComments: jest.fn(),
});

export const createConfigureServiceMock = (): CaseConfigureServiceMock => ({
  delete: jest.fn(),
  get: jest.fn(),
  find: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
});

export const connectorMappingsServiceMock = (): ConnectorMappingsServiceMock => ({
  delete: jest.fn(),
  get: jest.fn(),
  find: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
});

export const createUserActionServiceMock = (): CaseUserActionServiceMock => ({
  getUserActions: jest.fn(),
  postUserActions: jest.fn(),
});
