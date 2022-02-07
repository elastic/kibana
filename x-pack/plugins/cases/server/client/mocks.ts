/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicContract, PublicMethodsOf } from '@kbn/utility-types';

import { CasesClient } from '.';
import { AttachmentsSubClient } from './attachments/client';
import { CasesSubClient } from './cases/client';
import { ConfigureSubClient } from './configure/client';
import { CasesClientFactory } from './factory';
import { MetricsSubClient } from './metrics/client';
import { UserActionsSubClient } from './user_actions/client';

type CasesSubClientMock = jest.Mocked<CasesSubClient>;

const createCasesSubClientMock = (): CasesSubClientMock => {
  return {
    create: jest.fn(),
    find: jest.fn(),
    resolve: jest.fn(),
    get: jest.fn(),
    push: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getTags: jest.fn(),
    getReporters: jest.fn(),
    getCasesByAlertID: jest.fn(),
  };
};

type MetricsSubClientMock = jest.Mocked<MetricsSubClient>;

const createMetricsSubClientMock = (): MetricsSubClientMock => {
  return {
    getCaseMetrics: jest.fn(),
    getStatusTotalsByType: jest.fn(),
  };
};

type AttachmentsSubClientMock = jest.Mocked<AttachmentsSubClient>;

const createAttachmentsSubClientMock = (): AttachmentsSubClientMock => {
  return {
    add: jest.fn(),
    deleteAll: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    getAll: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    getAllAlertsAttachToCase: jest.fn(),
  };
};

type UserActionsSubClientMock = jest.Mocked<UserActionsSubClient>;

const createUserActionsSubClientMock = (): UserActionsSubClientMock => {
  return {
    getAll: jest.fn(),
  };
};

type ConfigureSubClientMock = jest.Mocked<ConfigureSubClient>;

const createConfigureSubClientMock = (): ConfigureSubClientMock => {
  return {
    get: jest.fn(),
    getConnectors: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };
};

export interface CasesClientMock extends CasesClient {
  cases: CasesSubClientMock;
  attachments: AttachmentsSubClientMock;
  userActions: UserActionsSubClientMock;
}

export const createCasesClientMock = (): CasesClientMock => {
  const client: PublicContract<CasesClient> = {
    cases: createCasesSubClientMock(),
    attachments: createAttachmentsSubClientMock(),
    userActions: createUserActionsSubClientMock(),
    configure: createConfigureSubClientMock(),
    metrics: createMetricsSubClientMock(),
  };
  return client as unknown as CasesClientMock;
};

export type CasesClientFactoryMock = jest.Mocked<CasesClientFactory>;

export const createCasesClientFactory = (): CasesClientFactoryMock => {
  const factory: PublicMethodsOf<CasesClientFactory> = {
    initialize: jest.fn(),
    create: jest.fn(),
  };

  return factory as unknown as CasesClientFactoryMock;
};
