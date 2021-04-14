/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicContract, PublicMethodsOf } from '@kbn/utility-types';

import { CasesClient, CasesClientInternal } from '.';
import { AttachmentsSubClient } from './attachments/client';
import { CasesSubClient } from './cases/client';
import { CasesClientFactory } from './factory';
import { SubCasesClient } from './sub_cases/client';
import { UserActionsSubClient } from './user_actions/client';

type CasesSubClientMock = jest.Mocked<CasesSubClient>;

const createCasesSubClientMock = (): CasesSubClientMock => {
  return {
    create: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    push: jest.fn(),
    update: jest.fn(),
  };
};

type AttachmentsSubClientMock = jest.Mocked<AttachmentsSubClient>;

const createAttachmentsSubClientMock = (): AttachmentsSubClientMock => {
  return {
    add: jest.fn(),
  };
};

type UserActionsSubClientMock = jest.Mocked<UserActionsSubClient>;

const createUserActionsSubClientMock = (): UserActionsSubClientMock => {
  return {
    getAll: jest.fn(),
  };
};

type SubCasesClientMock = jest.Mocked<SubCasesClient>;

const createSubCasesClientMock = (): SubCasesClientMock => {
  return {
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };
};

type CasesClientInternalMock = jest.Mocked<CasesClientInternal>;

export interface CasesClientMock extends CasesClient {
  cases: CasesSubClientMock;
  attachments: AttachmentsSubClientMock;
  userActions: UserActionsSubClientMock;
  subCases: SubCasesClientMock;
}

export const createCasesClientMock = (): CasesClientMock => {
  const client: PublicContract<CasesClient> = {
    casesClientInternal: (jest.fn() as unknown) as CasesClientInternalMock,
    cases: createCasesSubClientMock(),
    attachments: createAttachmentsSubClientMock(),
    userActions: createUserActionsSubClientMock(),
    subCases: createSubCasesClientMock(),
  };
  return (client as unknown) as CasesClientMock;
};

export type CasesClientFactoryMock = jest.Mocked<CasesClientFactory>;

export const createCasesClientFactory = (): CasesClientFactoryMock => {
  const factory: PublicMethodsOf<CasesClientFactory> = {
    initialize: jest.fn(),
    create: jest.fn(),
  };

  return (factory as unknown) as CasesClientFactoryMock;
};
