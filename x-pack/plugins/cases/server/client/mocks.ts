/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicContract, PublicMethodsOf } from '@kbn/utility-types';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';

import { securityMock } from '@kbn/security-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client.mock';
import { makeLensEmbeddableFactory } from '@kbn/lens-plugin/server/embeddable/make_lens_embeddable_factory';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';

import type { CasesFindRequest } from '../../common/api';
import type { CasesClient } from '.';
import type { AttachmentsSubClient } from './attachments/client';
import type { CasesSubClient } from './cases/client';
import type { ConfigureSubClient } from './configure/client';
import type { CasesClientFactory } from './factory';
import type { MetricsSubClient } from './metrics/client';
import type { UserActionsSubClient } from './user_actions/client';

import { CaseStatuses } from '../../common';
import { CaseSeverity } from '../../common/api';
import { SortFieldCase } from '../../public/containers/types';
import {
  createExternalReferenceAttachmentTypeRegistryMock,
  createPersistableStateAttachmentTypeRegistryMock,
} from '../attachment_framework/mocks';
import { createAuthorizationMock } from '../authorization/mock';
import {
  connectorMappingsServiceMock,
  createAlertServiceMock,
  createAttachmentServiceMock,
  createCaseServiceMock,
  createConfigureServiceMock,
  createLicensingServiceMock,
  createUserActionServiceMock,
  createNotificationServiceMock,
} from '../services/mocks';

type CasesSubClientMock = jest.Mocked<CasesSubClient>;

const createCasesSubClientMock = (): CasesSubClientMock => {
  return {
    create: jest.fn(),
    find: jest.fn(),
    resolve: jest.fn(),
    get: jest.fn(),
    bulkGet: jest.fn(),
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
    getCasesMetrics: jest.fn(),
    getStatusTotalsByType: jest.fn(),
  };
};

type AttachmentsSubClientMock = jest.Mocked<AttachmentsSubClient>;

const createAttachmentsSubClientMock = (): AttachmentsSubClientMock => {
  return {
    bulkGet: jest.fn(),
    add: jest.fn(),
    bulkCreate: jest.fn(),
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
    find: jest.fn(),
    getAll: jest.fn(),
    getConnectors: jest.fn(),
    stats: jest.fn(),
    getUsers: jest.fn(),
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

type SavedObjectsSerializerMock = jest.Mocked<ISavedObjectsSerializer>;

export const createSavedObjectsSerializerMock = (): SavedObjectsSerializerMock => {
  const serializer = serializerMock.create();
  serializer.generateRawId.mockImplementation(
    (namespace: string | undefined, type: string, id: string) => {
      const namespacePrefix = namespace ? `${namespace}:` : '';
      return `${namespacePrefix}${type}:${id}`;
    }
  );

  return serializer;
};

export const createCasesClientMockArgs = () => {
  return {
    services: {
      alertsService: createAlertServiceMock(),
      attachmentService: createAttachmentServiceMock(),
      caseService: createCaseServiceMock(),
      caseConfigureService: createConfigureServiceMock(),
      connectorMappingsService: connectorMappingsServiceMock(),
      userActionService: createUserActionServiceMock(),
      licensingService: createLicensingServiceMock(),
      notificationService: createNotificationServiceMock(),
    },
    authorization: createAuthorizationMock(),
    logger: loggingSystemMock.createLogger(),
    unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
    actionsClient: actionsClientMock.create(),
    user: {
      username: 'damaged_raccoon',
      email: 'damaged_raccoon@elastic.co',
      full_name: 'Damaged Raccoon',
      profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
    },
    spaceId: 'default',
    externalReferenceAttachmentTypeRegistry: createExternalReferenceAttachmentTypeRegistryMock(),
    persistableStateAttachmentTypeRegistry: createPersistableStateAttachmentTypeRegistryMock(),
    securityStartPlugin: securityMock.createStart(),
    lensEmbeddableFactory: jest.fn().mockReturnValue(
      makeLensEmbeddableFactory(
        () => ({}),
        () => ({}),
        {}
      )
    ),
    savedObjectsSerializer: createSavedObjectsSerializerMock(),
  };
};

export const createCasesClientMockFindRequest = (
  overwrites?: CasesFindRequest
): CasesFindRequest => ({
  search: '',
  searchFields: ['title', 'description'],
  severity: CaseSeverity.LOW,
  assignees: [],
  reporters: [],
  status: CaseStatuses.open,
  tags: [],
  owner: [],
  sortField: SortFieldCase.createdAt,
  sortOrder: 'desc',
  ...overwrites,
});
